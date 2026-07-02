import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const timingSafeEqualHex = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

const getString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const userIdFromExternalReference = (value: unknown): string | null => {
  const reference = getString(value);
  if (!reference) return null;
  return reference.match(/^deposit-([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})-/i)?.[1] ?? null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MP_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MP_TOKEN) throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MP_WEBHOOK_SECRET = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const rawBody = await req.text();
    const body = rawBody ? JSON.parse(rawBody) : {};

    let paymentId: string | null = null;

    if (body.topic === "payment" && body.id) {
      paymentId = String(body.id);
    } else if (body.data?.id && body.action?.includes("payment")) {
      paymentId = String(body.data.id);
    } else if (body.type === "payment" && body.data?.id) {
      paymentId = String(body.data.id);
    } else if (url.searchParams.get("data.id")) {
      paymentId = url.searchParams.get("data.id");
    } else if (url.searchParams.get("id")) {
      paymentId = url.searchParams.get("id");
    }

    // ---- Verify x-signature per Mercado Pago spec ----
    // https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks
    if (MP_WEBHOOK_SECRET) {
      const sigHeader = req.headers.get("x-signature") || "";
      const requestId = req.headers.get("x-request-id") || "";
      const dataId = (url.searchParams.get("data.id") || url.searchParams.get("id") || paymentId || "").toLowerCase();

      const parts = Object.fromEntries(
        sigHeader.split(",").map((p) => {
          const [k, v] = p.split("=").map((s) => s.trim());
          return [k, v];
        })
      ) as Record<string, string>;
      const ts = parts["ts"];
      const v1 = parts["v1"];

      if (!ts || !v1) {
        console.warn("Missing x-signature parts");
        return new Response(JSON.stringify({ error: "invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(MP_WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sigBytes = new Uint8Array(
        await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest))
      );
      const expected = Array.from(sigBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (!timingSafeEqualHex(expected, v1)) {
        console.warn("Invalid x-signature");
        return jsonResponse({ error: "invalid signature" }, 401);
      }
    } else {
      console.warn("MERCADO_PAGO_WEBHOOK_SECRET not set — skipping signature verification");
    }

    console.log("Webhook received:", JSON.stringify(body));

    if (!paymentId) {
      console.log("Not a payment notification, ignoring");
      return jsonResponse({ ok: true });
    }

    // Fetch payment details from MP API
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });

    if (!mpRes.ok) {
      const errText = await mpRes.text();
      console.error(`MP API error [${mpRes.status}]: ${errText}`);
      return jsonResponse({ error: "Failed to fetch payment" });
    }

    const payment = await mpRes.json();
    console.log("Payment status:", payment.status, "Amount:", payment.transaction_amount);

    if (payment.status !== "approved") {
      console.log(`Payment ${paymentId} status is ${payment.status}, not crediting`);
      return jsonResponse({ ok: true, status: payment.status });
    }

    const metadata = payment.metadata ?? {};
    let walletId = getString(metadata.wallet_id);
    const userId = getString(metadata.user_id) ?? userIdFromExternalReference(payment.external_reference);

    if (!userId) {
      console.error("Missing user reference in payment:", payment.metadata, payment.external_reference);
      return jsonResponse({ error: "Missing user reference" });
    }

    if (walletId) {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id,user_id")
        .eq("id", walletId)
        .maybeSingle();

      if (!wallet || wallet.user_id !== userId) {
        console.error("Wallet metadata does not match payment user", { walletId, userId });
        return jsonResponse({ error: "Invalid wallet reference" });
      }
    } else {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      walletId = wallet?.id ?? null;
    }

    if (!walletId) {
      console.error("Wallet not found for payment user", { userId, metadata: payment.metadata });
      return jsonResponse({ error: "Wallet not found" });
    }

    const amount = Number(payment.transaction_amount);
    const mpDescription = `Depósito via ${payment.payment_method_id === "pix" ? "Pix" : "Cartão"} - MP #${paymentId}`;

    // Check for duplicate processing using description
    const { data: existingTx } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("wallet_id", walletId)
      .eq("type", "DEPOSITO")
      .eq("description", mpDescription)
      .maybeSingle();

    if (existingTx) {
      console.log(`Payment ${paymentId} already processed, skipping`);
      return jsonResponse({ ok: true, already_processed: true });
    }

    const { data: credited, error: creditError } = await supabase.rpc("credit_deposit_once", {
      p_wallet_id: walletId,
      p_amount: amount,
      p_description: mpDescription,
    });

    if (creditError) {
      console.error("Error crediting wallet via RPC:", creditError);
      return jsonResponse({ error: "credit_failed" });
    }

    console.log(`Successfully credited R$ ${amount} to wallet ${walletId}`);

    return jsonResponse({ ok: true, credited: credited ? amount : 0, already_processed: credited === false });
  } catch (err) {
    console.error("Webhook error:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Internal error" });
  }
});
