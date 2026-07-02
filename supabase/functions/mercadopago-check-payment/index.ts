import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizePaymentId = (value: unknown): string | null => {
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return trimmed;
};

const getString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const userIdFromExternalReference = (value: unknown): string | null => {
  const reference = getString(value);
  if (!reference) return null;
  return reference.match(/^deposit-([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})-/i)?.[1] ?? null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const MP_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MP_TOKEN) throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const { payment_id } = await req.json();
    const paymentId = normalizePaymentId(payment_id);
    if (!paymentId) {
      return jsonResponse({ error: "payment_id required" }, 400);
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    if (!mpRes.ok) {
      const errText = await mpRes.text();
      console.error(`MP fetch error [${mpRes.status}] for payment ${paymentId}:`, errText);
      return jsonResponse({ status: "not_found", credited: false, retryable: true }, 200);
    }
    const payment = await mpRes.json();

    const metadata = payment.metadata ?? {};
    const paymentUserId = getString(metadata.user_id) ?? userIdFromExternalReference(payment.external_reference);

    // Ownership check via metadata/external_reference
    if (paymentUserId !== userId) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    if (payment.status !== "approved") {
      return jsonResponse({ status: payment.status, credited: false });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const metadataWalletId = getString(metadata.wallet_id);
    const amount = Number(payment.transaction_amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonResponse({ error: "Invalid payment amount" }, 400);
    }

    let walletQuery = admin
      .from("wallets")
      .select("id,user_id,balance")
      .eq("user_id", userId);

    if (metadataWalletId) {
      walletQuery = walletQuery.eq("id", metadataWalletId);
    }

    const { data: wallet, error: walletError } = await walletQuery.maybeSingle();

    if (walletError || !wallet) {
      return jsonResponse({ error: "Wallet not found" }, 403);
    }

    const walletId = wallet.id;

    const description = `Depósito via ${payment.payment_method_id === "pix" ? "Pix" : "Cartão"} - MP #${paymentId}`;

    // Idempotency check
    const { data: existing } = await admin
      .from("wallet_transactions")
      .select("id")
      .eq("wallet_id", walletId)
      .eq("type", "DEPOSITO")
      .eq("description", description)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ status: "approved", credited: true, already_processed: true });
    }

    const { data: credited, error: creditError } = await admin.rpc("credit_deposit_once", {
      p_wallet_id: walletId,
      p_amount: amount,
      p_description: description,
    });
    if (creditError) {
      console.error("credit_deposit_once error:", creditError);
      return jsonResponse({ status: "approved", credited: false, retryable: true, error: "credit_failed" });
    }

    return jsonResponse({ status: "approved", credited: true, already_processed: credited === false, amount });
  } catch (err) {
    console.error("check-payment error:", err);
    return jsonResponse({ error: "service_unavailable", retryable: true });
  }
});
