import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateInvoiceRequest {
  orderId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.user.id;

    // Parse request
    const { orderId }: CreateInvoiceRequest = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('customer_id', userId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if there's already an active payment
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'PENDING')
      .gt('expired_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingPayment) {
      return new Response(JSON.stringify({
        success: true,
        payment: existingPayment,
        message: 'Using existing active payment',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Duitku credentials
    const merchantCode = Deno.env.get('DUITKU_MERCHANT_CODE')!;
    const apiKey = Deno.env.get('DUITKU_API_KEY')!;
    const duitkuEnv = Deno.env.get('DUITKU_ENV') || 'sandbox';
    const baseUrl = duitkuEnv === 'production'
      ? 'https://passport.duitku.com/webapi/api/merchant'
      : 'https://sandbox.duitku.com/webapi/api/merchant';

    // Generate merchant order ID
    const merchantOrderId = `${order.order_code}-${Date.now()}`;
    const amount = order.total;
    const productDetails = `Pembayaran ${order.order_code}`;
    const customerEmail = claimsData.user.email || 'customer@example.com';

    // Create signature: MD5(merchantCode + merchantOrderId + amount + apiKey)
    const signatureString = merchantCode + merchantOrderId + amount + apiKey;
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Duitku API request
    const duitkuPayload = {
      merchantCode,
      paymentAmount: amount,
      merchantOrderId,
      productDetails,
      email: customerEmail,
      paymentMethod: 'SP', // QRIS
      returnUrl: Deno.env.get('DUITKU_RETURN_URL') || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/orders/${orderId}`,
      callbackUrl: Deno.env.get('DUITKU_CALLBACK_URL') || `${supabaseUrl}/functions/v1/duitku-callback`,
      signature,
      expiryPeriod: 15, // 15 minutes
    };

    console.log('Duitku request:', { ...duitkuPayload, signature: '***' });

    const duitkuResponse = await fetch(`${baseUrl}/v2/inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duitkuPayload),
    });

    const duitkuData = await duitkuResponse.json();
    console.log('Duitku response:', duitkuData);

    if (duitkuData.statusCode !== '00') {
      return new Response(JSON.stringify({
        error: 'Failed to create Duitku invoice',
        details: duitkuData.statusMessage,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate expiry time
    const expiredAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Insert payment record using service role to bypass RLS
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        order_id: orderId,
        store_id: order.store_id,
        provider: 'DUITKU',
        reference: duitkuData.reference,
        invoice_id: merchantOrderId,
        qris_url: duitkuData.paymentUrl,
        qr_string: duitkuData.qrString,
        amount,
        status: 'PENDING',
        expired_at: expiredAt,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment insert error:', paymentError);
      return new Response(JSON.stringify({ error: 'Failed to save payment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      payment,
      duitku: {
        reference: duitkuData.reference,
        paymentUrl: duitkuData.paymentUrl,
        qrString: duitkuData.qrString,
        amount: duitkuData.amount,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
