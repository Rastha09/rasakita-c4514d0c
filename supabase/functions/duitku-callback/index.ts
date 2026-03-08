import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const merchantCode = Deno.env.get('DUITKU_MERCHANT_CODE')!;
    const apiKey = Deno.env.get('DUITKU_API_KEY')!;

    let callbackData: Record<string, string>;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      callbackData = await req.json();
    } else {
      const formData = await req.formData();
      callbackData = {};
      formData.forEach((value, key) => {
        callbackData[key] = value.toString();
      });
    }

    console.log('Duitku callback received:', callbackData);

    const {
      merchantOrderId,
      reference,
      amount,
      signature: receivedSignature,
      resultCode,
    } = callbackData;

    // Validate signature
    const signatureString = merchantCode + amount + merchantOrderId + apiKey;
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (receivedSignature !== expectedSignature) {
      console.error('Invalid signature', { received: receivedSignature, expected: expectedSignature });
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, orders(*)')
      .or(`reference.eq.${reference},invoice_id.eq.${merchantOrderId}`)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found:', { reference, merchantOrderId });
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotent check
    if (payment.status === 'SUCCESS') {
      console.log('Payment already processed:', payment.id);
      return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let paymentStatus: string;
    let orderPaymentStatus: string;
    let orderStatus: string | null = null;

    if (resultCode === '00') {
      // SUCCESS → payment PAID, order becomes NEW (ready for admin)
      paymentStatus = 'SUCCESS';
      orderPaymentStatus = 'PAID';
      orderStatus = 'NEW';
    } else if (resultCode === '02') {
      // FAILED/CANCELED → payment FAILED, order CANCELED
      paymentStatus = 'FAILED';
      orderPaymentStatus = 'FAILED';
      orderStatus = 'CANCELED';
    } else {
      console.log('Callback received but status still pending:', resultCode);
      return new Response(JSON.stringify({ success: true, message: 'Status pending' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update payment status
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({ status: paymentStatus })
      .eq('id', payment.id);

    if (updatePaymentError) {
      console.error('Failed to update payment:', updatePaymentError);
    }

    // Update order status
    const orderUpdate: Record<string, string | boolean> = { payment_status: orderPaymentStatus };
    if (orderStatus) {
      orderUpdate.order_status = orderStatus;
    }

    const { error: updateOrderError } = await supabase
      .from('orders')
      .update(orderUpdate)
      .eq('id', payment.order_id);

    if (updateOrderError) {
      console.error('Failed to update order:', updateOrderError);
    }

    // If payment SUCCESS, update sold_count
    if (paymentStatus === 'SUCCESS') {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, items, sold_counted')
        .eq('id', payment.order_id)
        .single();

      if (!orderError && order && !order.sold_counted) {
        const items = order.items as Array<{ product_id: string; qty: number }>;
        if (Array.isArray(items)) {
          for (const item of items) {
            const { error: updateProductError } = await supabase.rpc('increment_sold_count', {
              p_product_id: item.product_id,
              p_qty: item.qty
            });
            if (updateProductError) {
              console.error('Failed to update sold_count for product:', item.product_id, updateProductError);
            }
          }
        }

        const { error: markCountedError } = await supabase
          .from('orders')
          .update({ sold_counted: true })
          .eq('id', payment.order_id);

        if (markCountedError) {
          console.error('Failed to mark order as sold_counted:', markCountedError);
        }
      }
    }

    // If payment FAILED → also restore stock if it was somehow deducted (safety)
    // Note: stock is only deducted on COMPLETED+PAID, so this is mainly for future safety

    console.log('Callback processed successfully:', {
      paymentId: payment.id,
      orderId: payment.order_id,
      paymentStatus,
      orderPaymentStatus,
      orderStatus,
    });

    return new Response(JSON.stringify({ success: true }), {
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
