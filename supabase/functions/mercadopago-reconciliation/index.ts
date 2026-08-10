import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MP_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MP_TOKEN) throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check - only Admins
    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader?.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MP API - Last 7 days payments
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 7);
    const dateString = dateLimit.toISOString().split(".")[0] + "Z";

    const mpUrl = `https://api.mercadopago.com/v1/payments/search?status=approved&range=date_created&begin_date=${dateString}`;
    
    const mpRes = await fetch(mpUrl, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });

    if (!mpRes.ok) {
      const errText = await mpRes.text();
      throw new Error(`MP Search Error: ${errText}`);
    }

    const mpData = await mpRes.json();
    const payments = mpData.results || [];

    // Local DB - Get all wallet transactions of type DEPOSITO from the last 7 days
    const { data: localTransactions, error: txError } = await supabaseClient
      .from("wallet_transactions")
      .select("description, amount")
      .eq("type", "DEPOSITO")
      .gte("created_at", dateLimit.toISOString());

    if (txError) throw txError;

    const discrepancies = [];
    const localDescriptions = new Set(localTransactions?.map(t => t.description) || []);

    for (const payment of payments) {
      const mpId = String(payment.id);
      const expectedDescription = `Depósito via Pix - MP #${mpId}`;
      const expectedDescriptionAlt = `Depósito via Cartão - MP #${mpId}`;

      if (!localDescriptions.has(expectedDescription) && !localDescriptions.has(expectedDescriptionAlt)) {
        discrepancies.push({
          type: "external_mismatch",
          mp_id: mpId,
          amount: payment.transaction_amount,
          date: payment.date_created,
          status: payment.status,
          user_id: payment.metadata?.user_id,
          description: payment.description || "Pagamento Mercado Pago"
        });
      }
    }

    return new Response(JSON.stringify({ discrepancies }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
