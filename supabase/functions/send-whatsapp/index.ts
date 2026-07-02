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
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    if (!WHATSAPP_ACCESS_TOKEN) {
      throw new Error('WHATSAPP_ACCESS_TOKEN is not configured');
    }

    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    if (!WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WHATSAPP_PHONE_NUMBER_ID is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Verify caller is our internal DB trigger via shared secret from vaulted DB row
    const providedSecret = req.headers.get('x-internal-secret') || '';
    const secretRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_internal_webhook_secret`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const expectedSecret = (await secretRes.json())?.toString?.() || '';
    if (!providedSecret || providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const { record } = payload;

    if (!record) {
      throw new Error('No record in payload');
    }

    const userId = record.user_id;
    const title = record.title;
    const message = record.message;

    // Fetch the user's WhatsApp number from profiles
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=whatsapp,name`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const profiles = await profileRes.json();
    const profile = profiles?.[0];

    if (!profile?.whatsapp) {
      console.log(`User ${userId} has no WhatsApp number, skipping`);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'no_whatsapp' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean phone number: remove non-digits, ensure country code
    let phone = profile.whatsapp.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '55' + phone.substring(1);
    }
    if (!phone.startsWith('55')) {
      phone = '55' + phone;
    }

    // Send WhatsApp message via Meta Graph API
    const graphUrl = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    // First try sending as a template message (required for initiating conversations)
    // If you have a template configured, use it. Otherwise, fall back to text message.
    const whatsappPayload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: {
        preview_url: false,
        body: `*${title}*\n\n${message}`,
      },
    };

    console.log(`Sending WhatsApp to ${phone}: ${title}`);

    const waResponse = await fetch(graphUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whatsappPayload),
    });

    const waResult = await waResponse.json();
    console.log('WhatsApp API response:', JSON.stringify(waResult));

    if (!waResponse.ok) {
      console.error('WhatsApp API error:', waResult);
      // Don't throw — we don't want to break the trigger flow
      return new Response(JSON.stringify({ success: false, error: waResult }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message_id: waResult.messages?.[0]?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, // Return 200 to not break trigger flow
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
