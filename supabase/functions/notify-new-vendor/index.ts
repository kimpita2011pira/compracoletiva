import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const payload = await req.json();
    const { record } = payload;

    if (!record) {
      throw new Error('No record in payload');
    }

    const event = payload.event || 'new_vendor_registration';
    const old_record = payload.old_record;

    let message = '';
    let zapierPayload: any = {
      event,
      created_at: record.created_at,
    };

    if (event === 'vendor_status_change') {
      const statusLabels: Record<string, string> = {
        APROVADO: '✅ Aprovado',
        REJEITADO: '❌ Rejeitado',
      };
      const label = statusLabels[record.status] || record.status;
      message = `${label}: ${record.company_name}${record.city ? ` (${record.city})` : ''}${record.cnpj ? ` — CNPJ: ${record.cnpj}` : ''}`;
      
      zapierPayload = {
        ...zapierPayload,
        vendor_id: record.id,
        company_name: record.company_name,
        cnpj: record.cnpj,
        city: record.city,
        description: record.description,
        status: record.status,
        previous_status: old_record?.status || null,
        message,
      };
    } else if (event === 'new_offer_published') {
      const vendorName = payload.vendor_name || 'Vendedor';
      message = `📣 Nova oferta publicada: ${record.title} por ${vendorName} — Preço: R$ ${record.offer_price}`;
      
      zapierPayload = {
        ...zapierPayload,
        offer_id: record.id,
        offer_title: record.title,
        offer_price: record.offer_price,
        vendor_id: record.vendor_id,
        vendor_name: vendorName,
        message,
      };
    } else if (event === 'offer_status_change') {
      const vendorName = payload.vendor_name || 'Vendedor';
      const statusLabels: Record<string, string> = {
        VALIDADA: '✅ Validada',
        CANCELADA: '❌ Cancelada',
        ENCERRADA: '🏁 Encerrada',
        ATIVA: '🟢 Ativa'
      };
      const label = statusLabels[record.status] || record.status;
      message = `🔄 Status da oferta alterado: ${record.title} (${vendorName}) mudou para ${label}`;
      
      zapierPayload = {
        ...zapierPayload,
        offer_id: record.id,
        offer_title: record.title,
        status: record.status,
        previous_status: old_record?.status || null,
        vendor_id: record.vendor_id,
        vendor_name: vendorName,
        message,
      };
    } else if (event === 'new_order_reservation') {
      const buyerName = payload.buyer_name || 'Cliente';
      const offerTitle = payload.offer_title || 'oferta';
      const vendorName = payload.vendor_name || 'Vendedor';
      message = `🛒 Nova reserva: ${buyerName} reservou ${record.quantity}x "${offerTitle}" — R$ ${record.total_price} (${record.delivery_type === 'DELIVERY' ? 'Entrega' : 'Retirada'})`;
      
      zapierPayload = {
        ...zapierPayload,
        order_id: record.id,
        offer_id: record.offer_id,
        offer_title: offerTitle,
        buyer_name: buyerName,
        vendor_name: vendorName,
        quantity: record.quantity,
        unit_price: record.unit_price,
        total_price: record.total_price,
        delivery_type: record.delivery_type,
        message,
      };
    } else {
      message = `🆕 Novo vendedor cadastrado: ${record.company_name}${record.city ? ` (${record.city})` : ''}${record.cnpj ? ` — CNPJ: ${record.cnpj}` : ''}`;
      
      zapierPayload = {
        ...zapierPayload,
        vendor_id: record.id,
        company_name: record.company_name,
        cnpj: record.cnpj,
        city: record.city,
        description: record.description,
        status: record.status,
        message,
      };
    }

    console.log('Sending to Zapier:', JSON.stringify(zapierPayload));

    const response = await fetch(ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zapierPayload),
    });

    const responseText = await response.text();
    console.log('Zapier response:', response.status, responseText);

    return new Response(JSON.stringify({ success: true }), {
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
