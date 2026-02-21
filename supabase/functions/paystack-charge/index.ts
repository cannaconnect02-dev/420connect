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
        const { email, amount, payment_method_id, split_code, subaccount_code, metadata, store_id } = await req.json();

        if (!email || !amount) {
            throw new Error('Missing required fields: email, amount');
        }

        console.log(`Creating charge for ${email}, amount: ${amount}, store: ${store_id}`);

        // 4. Prepare Paystack Payload
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

        // --- Store Ledger & Dynamic Split Calculation ---
        let debtRecovered = 0;
        let usedDynamicCharge = false;

        if (store_id) {
            // Fetch store balance and custom percentage
            const { data: storeRef, error: storeError } = await supabaseAdmin
                .from('stores')
                .select('ledger_balance, paystack_split_percentage')
                .eq('id', store_id)
                .single();

            if (storeError) {
                console.error('Error fetching store ledger details:', storeError);
            } else if (storeRef) {
                const balanceOwed = Number(storeRef.ledger_balance || 0);
                const platformSplitPercentage = Number(storeRef.paystack_split_percentage || 17);

                // Option 2 Implementation: We enforce the custom transaction_charge
                if (balanceOwed > 0 || platformSplitPercentage !== 0) {
                    paystackPayload.subaccount = subaccount_code; // Must point to the subaccount

                    // Calculate platform's percentage cut (in cents)
                    const basePlatformFeeCents = Math.round(paystackAmount * (platformSplitPercentage / 100));

                    // Add whatever is owed by the store to our cut. 
                    const debtOwedCents = Math.round(balanceOwed * 100);

                    // The total charge the platform keeps over the store's transaction
                    // CRITICAL FIX: We must cap this below the total paystackAmount or Paystack will reject it.
                    // We leave at least R1 (100 cents) for the store/transaction overhead to be safe.
                    const maxPlatformChargeCents = Math.max(0, paystackAmount - 100);
                    const requestedPlatformChargeCents = basePlatformFeeCents + debtOwedCents;

                    const actualPlatformChargeCents = Math.min(requestedPlatformChargeCents, maxPlatformChargeCents);

                    // Paystack will send the flat `transaction_charge` to the main account, remainder to the subaccount
                    paystackPayload.transaction_charge = actualPlatformChargeCents;
                    usedDynamicCharge = true;

                    // Tag how much debt was recovered in metadata (only the portion above the base fee)
                    const actualDebtRecoveredCents = Math.max(0, actualPlatformChargeCents - basePlatformFeeCents);
                    debtRecovered = actualDebtRecoveredCents / 100;

                    if (debtRecovered > 0) {
                        paystackPayload.metadata.debt_recovered = debtRecovered;
                        paystackPayload.metadata.store_id = store_id;
                        console.log(`Overriding split: ${platformSplitPercentage}% fee + R${debtRecovered} debt recovery (Capped: ${actualPlatformChargeCents} cents).`);
                    } else {
                        console.log(`Overriding split: custom ${platformSplitPercentage}% base fee. Total charge: ${actualPlatformChargeCents} cents.`);
                    }
                }
            }
        }

        // Fallback to legacy split logic if no dynamic charge was calculated
        if (!usedDynamicCharge) {
            if (split_code) {
                paystackPayload.split_code = split_code;
                console.log(`Using Transaction Split: ${split_code}`);
            } else if (subaccount_code) {
                paystackPayload.subaccount = subaccount_code;
                console.log(`Using direct subaccount: ${subaccount_code}`);
            }
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

        console.log(`Payload being sent to Paystack (${apiUrl}):`, JSON.stringify(paystackPayload, null, 2));

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
