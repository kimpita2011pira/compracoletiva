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

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // MP sends different notification formats
    // IPN format: { topic: "payment", id: "123" }
    // Webhook format: { action: "payment.updated", data: { id: "123" } }
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
        status: 200, // Return 200 so MP doesn't retry indefinitely
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await mpRes.json();
    console.log("Payment status:", payment.status, "Amount:", payment.transaction_amount);

    if (payment.status !== "approved") {
      console.log(`Payment ${paymentId} status is ${payment.status}, not crediting wallet`);
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

    // Check for duplicate processing
    const { data: existingTx } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("reference_id", paymentId)
      .eq("type", "DEPOSITO")
      .maybeSingle();

    if (existingTx) {
      console.log(`Payment ${paymentId} already processed, skipping`);
      return new Response(JSON.stringify({ ok: true, already_processed: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = Number(payment.transaction_amount);

    // Credit wallet balance
    const { error: updateError } = await supabase
      .from("wallets")
      .update({
        balance: undefined, // We'll use rpc or raw update
      })
      .eq("id", walletId);

    // Use direct SQL-like update for atomic increment
    const { data: walletData, error: walletError } = await supabase.rpc("credit_wallet", {
      p_wallet_id: walletId,
      p_amount: amount,
      p_description: `Depósito via ${payment.payment_method_id === "pix" ? "Pix" : "Cartão"} - MP #${paymentId}`,
      p_reference_id: paymentId,
    });

    if (walletError) {
      console.error("Error crediting wallet:", walletError);
      // Fallback: direct insert
      const { error: balError } = await supabase
        .from("wallets")
        .update({ balance: undefined })
        .eq("id", walletId);

      // Manual credit
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
          description: `Depósito via ${payment.payment_method_id === "pix" ? "Pix" : "Cartão"} - MP #${paymentId}`,
          reference_id: paymentId,
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
