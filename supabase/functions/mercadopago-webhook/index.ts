import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    // Read raw body so we can both verify signature and parse JSON
    const rawBody = await req.text();

    // ---- Verify x-signature per Mercado Pago spec ----
    // https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks
    if (MP_WEBHOOK_SECRET) {
      const sigHeader = req.headers.get("x-signature") || "";
      const requestId = req.headers.get("x-request-id") || "";
      const url = new URL(req.url);
      const dataId = url.searchParams.get("data.id") || url.searchParams.get("id") || "";

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

      if (expected !== v1) {
        console.warn("Invalid x-signature");
        return new Response(JSON.stringify({ error: "invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("MERCADO_PAGO_WEBHOOK_SECRET not set — skipping signature verification");
    }

    const body = JSON.parse(rawBody);

    console.log("Webhook received:", JSON.stringify(body));

    let paymentId: string | null = null;

    if (body.topic === "payment" && body.id) {
      paymentId = String(body.id);
    } else if (body.data?.id && body.action?.includes("payment")) {
      paymentId = String(body.data.id);
    } else if (body.type === "payment" && body.data?.id) {
      paymentId = String(body.data.id);
    }

    if (!paymentId) {
      console.log("Not a payment notification, ignoring");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment details from MP API
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });

    if (!mpRes.ok) {
      const errText = await mpRes.text();
      console.error(`MP API error [${mpRes.status}]: ${errText}`);
      return new Response(JSON.stringify({ error: "Failed to fetch payment" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await mpRes.json();
    console.log("Payment status:", payment.status, "Amount:", payment.transaction_amount);

    if (payment.status !== "approved") {
      console.log(`Payment ${paymentId} status is ${payment.status}, not crediting`);
      return new Response(JSON.stringify({ ok: true, status: payment.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const walletId = payment.metadata?.wallet_id;
    const userId = payment.metadata?.user_id;

    if (!walletId || !userId) {
      console.error("Missing metadata in payment:", payment.metadata);
      return new Response(JSON.stringify({ error: "Missing metadata" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = Number(payment.transaction_amount);
    const mpDescription = `Depósito via ${payment.payment_method_id === "pix" ? "Pix" : "Cartão"} - MP #${paymentId}`;

    // Check for duplicate processing using description
    const { data: existingTx } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("wallet_id", walletId)
      .eq("type", "DEPOSITO")
      .like("description", `%MP #${paymentId}%`)
      .maybeSingle();

    if (existingTx) {
      console.log(`Payment ${paymentId} already processed, skipping`);
      return new Response(JSON.stringify({ ok: true, already_processed: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Credit wallet atomically
    const { error: creditError } = await supabase.rpc("credit_wallet", {
      p_wallet_id: walletId,
      p_amount: amount,
      p_description: mpDescription,
    });

    if (creditError) {
      console.error("Error crediting wallet via RPC:", creditError);
      // Fallback: manual credit
      const { data: currentWallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", walletId)
        .single();

      if (currentWallet) {
        await supabase
          .from("wallets")
          .update({ balance: Number(currentWallet.balance) + amount, updated_at: new Date().toISOString() })
          .eq("id", walletId);

        await supabase.from("wallet_transactions").insert({
          wallet_id: walletId,
          type: "DEPOSITO",
          amount,
          description: mpDescription,
        });
      }
    }

    console.log(`Successfully credited R$ ${amount} to wallet ${walletId}`);

    return new Response(JSON.stringify({ ok: true, credited: amount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
