import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MP_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MP_TOKEN) throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Get user email for MP
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email ?? "cliente@email.com";

    const { amount, method } = await req.json();
    if (!amount || amount < 1) {
      return new Response(JSON.stringify({ error: "Valor mínimo de R$ 1,00" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create wallet
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!wallet) {
      return new Response(JSON.stringify({ error: "Carteira não encontrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookUrl = `${SUPABASE_URL}/functions/v1/mercadopago-webhook`;

    if (method === "pix") {
      // Create Pix payment
      const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MP_TOKEN}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `${userId}-${Date.now()}`,
        },
        body: JSON.stringify({
          transaction_amount: Number(amount),
          payment_method_id: "pix",
          description: `Depósito na carteira - R$ ${Number(amount).toFixed(2)}`,
          payer: { email },
          notification_url: webhookUrl,
          metadata: {
            user_id: userId,
            wallet_id: wallet.id,
            type: "deposit",
          },
        }),
      });

      const mpData = await mpRes.json();
      if (!mpRes.ok) {
        console.error("MP Pix error:", JSON.stringify(mpData));
        return new Response(
          JSON.stringify({ error: "Erro ao gerar Pix", details: mpData.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          payment_id: mpData.id,
          status: mpData.status,
          pix_qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
          pix_qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
          pix_copy_paste: mpData.point_of_interaction?.transaction_data?.qr_code,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (method === "card") {
      // Create Checkout Pro preference for card payments
      const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              title: "Depósito na Carteira",
              quantity: 1,
              unit_price: Number(amount),
              currency_id: "BRL",
            },
          ],
          payer: { email },
          back_urls: {
            success: `${req.headers.get("origin") || "https://compracoletiva.lovable.app"}/wallet?status=success`,
            failure: `${req.headers.get("origin") || "https://compracoletiva.lovable.app"}/wallet?status=failure`,
            pending: `${req.headers.get("origin") || "https://compracoletiva.lovable.app"}/wallet?status=pending`,
          },
          auto_return: "approved",
          notification_url: webhookUrl,
          metadata: {
            user_id: userId,
            wallet_id: wallet.id,
            type: "deposit",
          },
        }),
      });

      const mpData = await mpRes.json();
      if (!mpRes.ok) {
        console.error("MP Preference error:", JSON.stringify(mpData));
        return new Response(
          JSON.stringify({ error: "Erro ao criar checkout", details: mpData.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          preference_id: mpData.id,
          init_point: mpData.init_point,
          sandbox_init_point: mpData.sandbox_init_point,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Método inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
