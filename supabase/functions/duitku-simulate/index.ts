import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SimulateRequest {
  orderId: string;
  action: 'PAID' | 'EXPIRED' | 'RESET';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if sandbox mode
    const duitkuEnv = Deno.env.get('DUITKU_ENV') || 'sandbox';
    if (duitkuEnv === 'production') {
      return new Response(JSON.stringify({ error: 'Simulation only available in sandbox mode' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Verify user and check role
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is ADMIN or SUPER_ADMIN
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { orderId, action }: SimulateRequest = await req.json();

    if (!orderId || !action) {
      return new Response(JSON.stringify({ error: 'orderId and action are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for updates
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get latest payment for order
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (action === 'PAID') {
      // Simulate successful payment
      if (payment) {
        await supabaseAdmin
          .from('payments')
          .update({ status: 'SUCCESS' })
          .eq('id', payment.id);
      }

      await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'PAID', order_status: 'CONFIRMED' })
        .eq('id', orderId);

      return new Response(JSON.stringify({ success: true, message: 'Simulated PAID' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'EXPIRED') {
      // Simulate expired payment
      if (payment) {
        await supabaseAdmin
          .from('payments')
          .update({ status: 'EXPIRED' })
          .eq('id', payment.id);
      }

      await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'EXPIRED' })
        .eq('id', orderId);

      return new Response(JSON.stringify({ success: true, message: 'Simulated EXPIRED' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'RESET') {
      // Reset to UNPAID/PENDING state
      if (payment) {
        await supabaseAdmin
          .from('payments')
          .update({ status: 'PENDING', expired_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() })
          .eq('id', payment.id);
      }

      await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'UNPAID' })
        .eq('id', orderId);

      return new Response(JSON.stringify({ success: true, message: 'Reset to UNPAID' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
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
