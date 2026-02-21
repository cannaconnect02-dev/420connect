import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');

        if (!PAYSTACK_SECRET_KEY) {
            throw new Error('Missing PAYSTACK_SECRET_KEY configuration');
        }

        const { reference, transaction_id, cancelled_by = 'customer' } = await req.json();

        if (!reference && !transaction_id) {
            throw new Error('Missing transaction reference or ID');
        }

        console.log(`Initiating refund for Ref: ${reference}, ID: ${transaction_id}`);

        // Call Paystack Refund API
        const response = await fetch('https://api.paystack.co/refund', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                transaction: transaction_id || reference
            })
        });

        const result = await response.json();

        if (!result.status) {
            console.error('Paystack Refund Error:', result);
            throw new Error(result.message || 'Refund failed');
        }

        console.log('Refund Success:', result.data);

        // Update Order Status in DB (Optional, Webhook should also handle this)
        // Doing it here for immediate UI feedback consistency if needed
        if (reference) {
            await supabaseAdmin
                .from('orders')
                .update({
                    paystack_payment_status: 'refunded',
                    status: 'cancelled',
                    cancelled_by: cancelled_by
                })
                .eq('paystack_reference', reference);
        }

        return new Response(
            JSON.stringify({ success: true, data: result.data }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error: any) {
        console.error('Refund Error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
