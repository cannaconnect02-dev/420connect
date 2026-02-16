import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. Initialize Utils
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');

        if (!PAYSTACK_SECRET_KEY) {
            throw new Error('Missing PAYSTACK_SECRET_KEY configuration');
        }

        // 3. Parse Request
        const { email, amount, payment_method_id, metadata } = await req.json();

        if (!email || !amount) {
            throw new Error('Missing required fields: email, amount');
        }

        console.log(`Creating charge for ${email}, amount: ${amount}`);

        // 4. Prepare Paystack Payload
        // Amount is in Kobo (cents), so ensure we receive 1000 for 10.00
        // We assume 'amount' passed is already correct (e.g. 28000 for R280.00) or we document it.
        // Let's assume input is in base currency for safety and we multiply? 
        // NO, standard is usually lowest denomination.
        // Let's assume input 'amount' is in ZAR (e.g. 280) and we multiply by 100 for Kobo/Cents.
        // Wait, Paystack ZAR uses cents. 
        // Existing checkout.tsx used 'amount: 250'. 
        // Ensure consistency.

        const paystackAmount = Math.round(Number(amount) * 100); // R100 -> 10000 cents

        let paystackPayload: any = {
            email,
            amount: paystackAmount,
            currency: 'ZAR',
            callback_url: 'https://420connect.app/payment/success', // Dummy URL to detect success
            metadata: {
                ...metadata,
                custom_fields: []
            }
        };

        // If reusing a card (authorization_code)
        if (payment_method_id) {
            // Fetch auth code from DB
            const { data: pm, error: pmError } = await supabaseAdmin
                .from('payment_methods')
                .select('paystack_authorization_code')
                .eq('id', payment_method_id)
                .single();

            if (pmError || !pm) {
                throw new Error('Invalid Payment Method');
            }

            paystackPayload.authorization_code = pm.paystack_authorization_code;
        }

        // 5. Call Paystack API
        const endpoint = 'https://api.paystack.co/transaction/initialize';
        // Note: For recurring (auth code), we use 'transaction/charge_authorization' providing 'authorization_code'
        // But 'initialize' is for new flows.
        // If we have auth code, we use 'charge_authorization'.

        let apiUrl = endpoint;
        if (paystackPayload.authorization_code) {
            apiUrl = 'https://api.paystack.co/transaction/charge_authorization';
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paystackPayload)
        });

        const result = await response.json();

        if (!result.status) {
            console.error('Paystack Error:', result);
            throw new Error(result.message || 'Payment processing failed');
        }

        console.log('Paystack Response:', result.data);

        // 6. Return Result
        return new Response(
            JSON.stringify({
                success: true,
                data: result.data
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error: any) {
        console.error('Edge Function Error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
