import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const merchantCode = Deno.env.get('DUITKU_MERCHANT_CODE')!;
    const apiKey = Deno.env.get('DUITKU_API_KEY')!;

    // Parse callback data - Duitku sends form-urlencoded or JSON
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

    // Validate signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
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

    // Find payment by reference or invoice_id
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

    // Idempotent check - if already SUCCESS, don't reprocess
    if (payment.status === 'SUCCESS') {
      console.log('Payment already processed:', payment.id);
      return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map result code to status
    // 00 = Success, 01 = Pending, 02 = Canceled/Failed
    let paymentStatus: string;
    let orderPaymentStatus: string;
    let orderStatus: string | null = null;

    if (resultCode === '00') {
      paymentStatus = 'SUCCESS';
      orderPaymentStatus = 'PAID';
      orderStatus = 'CONFIRMED';
    } else if (resultCode === '02') {
      paymentStatus = 'FAILED';
      orderPaymentStatus = 'FAILED';
    } else {
      // Still pending or unknown, don't update
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

    // Update sold_count if payment SUCCESS and not already counted
    if (paymentStatus === 'SUCCESS') {
      // Fetch order to check sold_counted flag and get items
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, items, sold_counted')
        .eq('id', payment.order_id)
        .single();

      if (!orderError && order && !order.sold_counted) {
        // Parse items and update sold_count for each product
        const items = order.items as Array<{ product_id: string; qty: number }>;
        
        if (Array.isArray(items)) {
          for (const item of items) {
            // Increment sold_count using RPC or direct update
            const { error: updateProductError } = await supabase.rpc('increment_sold_count', {
              p_product_id: item.product_id,
              p_qty: item.qty
            }).catch(() => {
              // Fallback: direct update if RPC doesn't exist
              return supabase
                .from('products')
                .update({ sold_count: supabase.rpc('coalesce', { val: 0 }) })
                .eq('id', item.product_id);
            });

            if (updateProductError) {
              console.error('Failed to update sold_count for product:', item.product_id, updateProductError);
            }
          }
        }

        // Mark order as sold_counted
        const { error: markCountedError } = await supabase
          .from('orders')
          .update({ sold_counted: true })
          .eq('id', payment.order_id);

        if (markCountedError) {
          console.error('Failed to mark order as sold_counted:', markCountedError);
        }

        console.log('Updated sold_count for order:', payment.order_id);
      }

      console.log('Payment successful, push notification placeholder', {
        orderId: payment.order_id,
        orderCode: payment.orders?.order_code,
      });
    }

    console.log('Callback processed successfully:', {
      paymentId: payment.id,
      orderId: payment.order_id,
      paymentStatus,
      orderPaymentStatus,
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
