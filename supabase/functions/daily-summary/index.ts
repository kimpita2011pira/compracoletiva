import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZAPIER_WEBHOOK_URL = Deno.env.get('ZAPIER_WEBHOOK_URL');
    if (!ZAPIER_WEBHOOK_URL) {
      throw new Error('ZAPIER_WEBHOOK_URL is not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get today's date range (UTC)
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    // Use start of yesterday for the summary (covers the full previous day)
    const startOfYesterday = new Date(startOfDay);
    startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);

    const fromDate = startOfYesterday.toISOString();
    const toDate = startOfDay.toISOString();

    // Fetch orders from yesterday
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, quantity, unit_price, total_price, delivery_type, status, created_at, offer_id, user_id')
      .gte('created_at', fromDate)
      .lt('created_at', toDate);

    if (ordersError) throw ordersError;

    const totalOrders = orders?.length || 0;

    if (totalOrders === 0) {
      console.log('No orders yesterday, skipping summary.');
      return new Response(JSON.stringify({ success: true, message: 'No orders to report' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Aggregate metrics
    const totalRevenue = orders!.reduce((sum, o) => sum + Number(o.total_price), 0);
    const totalItems = orders!.reduce((sum, o) => sum + o.quantity, 0);
    const deliveryCount = orders!.filter(o => o.delivery_type === 'DELIVERY').length;
    const pickupCount = orders!.filter(o => o.delivery_type === 'RETIRADA').length;

    const statusCounts: Record<string, number> = {};
    orders!.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    // Get unique offer titles
    const offerIds = [...new Set(orders!.map(o => o.offer_id))];
    const { data: offers } = await supabase
      .from('offers')
      .select('id, title, vendor_id')
      .in('id', offerIds);

    // Get vendor names
    const vendorIds = [...new Set((offers || []).map(o => o.vendor_id))];
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, company_name')
      .in('id', vendorIds);

    const vendorMap = new Map((vendors || []).map(v => [v.id, v.company_name]));
    const offerMap = new Map((offers || []).map(o => [o.id, { title: o.title, vendor: vendorMap.get(o.vendor_id) || 'N/A' }]));

    // Build per-offer breakdown
    const offerBreakdown: Record<string, { title: string; vendor: string; count: number; revenue: number }> = {};
    orders!.forEach(o => {
      const info = offerMap.get(o.offer_id);
      if (!offerBreakdown[o.offer_id]) {
        offerBreakdown[o.offer_id] = {
          title: info?.title || 'N/A',
          vendor: info?.vendor || 'N/A',
          count: 0,
          revenue: 0,
        };
      }
      offerBreakdown[o.offer_id].count += o.quantity;
      offerBreakdown[o.offer_id].revenue += Number(o.total_price);
    });

    const topOffers = Object.values(offerBreakdown)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const dateLabel = startOfYesterday.toLocaleDateString('pt-BR');

    const message = [
      `📊 Resumo diário — ${dateLabel}`,
      ``,
      `🛒 Total de reservas: ${totalOrders}`,
      `📦 Itens reservados: ${totalItems}`,
      `💰 Receita total: R$ ${totalRevenue.toFixed(2)}`,
      `🚚 Entregas: ${deliveryCount} | 🏪 Retiradas: ${pickupCount}`,
      ``,
      `📋 Status:`,
      ...Object.entries(statusCounts).map(([s, c]) => `  • ${s}: ${c}`),
      ``,
      `🏆 Top ofertas:`,
      ...topOffers.map((o, i) => `  ${i + 1}. "${o.title}" (${o.vendor}) — ${o.count} un. / R$ ${o.revenue.toFixed(2)}`),
    ].join('\n');

    const zapierPayload = {
      event: 'daily_summary',
      date: dateLabel,
      total_orders: totalOrders,
      total_items: totalItems,
      total_revenue: totalRevenue.toFixed(2),
      delivery_count: deliveryCount,
      pickup_count: pickupCount,
      status_breakdown: statusCounts,
      top_offers: topOffers,
      message,
    };

    console.log('Sending daily summary to Zapier:', JSON.stringify(zapierPayload));

    const response = await fetch(ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zapierPayload),
    });

    const responseText = await response.text();
    console.log('Zapier response:', response.status, responseText);

    return new Response(JSON.stringify({ success: true, total_orders: totalOrders }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
