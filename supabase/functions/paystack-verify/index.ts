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
        const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
        if (!PAYSTACK_SECRET_KEY) {
            throw new Error('Missing PAYSTACK_SECRET_KEY configuration');
        }

        const { reference } = await req.json();

        if (!reference) {
            throw new Error('Missing reference');
        }

        // 2. Call Paystack Verify API
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (!result.status) {
            throw new Error(result.message || 'Verification failed');
        }

        const data = result.data;
        const status = data.status;

        // 3. If payment succeeded, update the database (order + payment method)
        if (status === 'success') {
            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );

            // Find the order by reference
            const { data: order, error: orderFetchError } = await supabaseAdmin
                .from('orders')
                .select('id, paystack_payment_status, customer_id, payment_method_id')
                .eq('paystack_reference', reference)
                .single();

            if (orderFetchError) {
                console.error('Error finding order for reference:', reference, orderFetchError);
            }

            if (order) {
                // Update payment status if not already processed
                if (order.paystack_payment_status !== 'charged' && order.paystack_payment_status !== 'refunded') {
                    const { error: updateError } = await supabaseAdmin
                        .from('orders')
                        .update({
                            paystack_payment_status: 'charged',
                            paystack_transaction_id: String(data.id)
                        })
                        .eq('id', order.id);

                    if (updateError) {
                        console.error('Failed to update order:', updateError);
                    } else {
                        console.log('Order marked as charged via verify:', order.id);
                    }
                }

                // Save Payment Method & link to order (runs even if already charged)
                if (data.authorization && data.authorization.reusable) {
                    const auth = data.authorization;

                    // Check if already exists
                    const { data: existingPm } = await supabaseAdmin
                        .from('payment_methods')
                        .select('id')
                        .eq('paystack_authorization_code', auth.authorization_code)
                        .eq('user_id', order.customer_id)
                        .maybeSingle();

                    let pmId: string | null = existingPm?.id ?? null;

                    if (!existingPm) {
                        const { data: newPm, error: insertError } = await supabaseAdmin.from('payment_methods').insert({
                            user_id: order.customer_id,
                            paystack_authorization_code: auth.authorization_code,
                            card_last4: String(auth.last4),
                            card_brand: auth.brand,
                            card_exp_month: String(auth.exp_month),
                            card_exp_year: String(auth.exp_year),
                            is_default: true
                        }).select('id').single();

                        if (insertError) {
                            console.error('Failed to save payment method:', insertError);
                        } else {
                            console.log('Payment Method Saved via verify for user:', order.customer_id);
                            pmId = newPm.id;
                        }
                    }

                    // Link payment method to the order if not already linked
                    if (pmId && !order.payment_method_id) {
                        await supabaseAdmin.from('orders').update({ payment_method_id: pmId }).eq('id', order.id);
                        console.log('Linked payment_method_id', pmId, 'to order', order.id);
                    }
                }

                // --- Handle Store Ledger Debt Recovery ---
                let metadata = data.metadata;
                if (typeof metadata === 'string') {
                    try {
                        metadata = JSON.parse(metadata);
                    } catch (e) {
                        console.error('Failed to parse metadata string:', metadata);
                        metadata = {};
                    }
                }

                if (metadata && metadata.debt_recovered && metadata.store_id) {
                    const recoveredAmount = Number(metadata.debt_recovered);
                    const storeId = metadata.store_id;

                    // Check if already recovered for this order to ensure idempotency
                    const { data: existingLedger } = await supabaseAdmin
                        .from('store_ledger')
                        .select('id')
                        .eq('order_id', order.id)
                        .eq('type', 'payout_deduction')
                        .maybeSingle();

                    if (!existingLedger) {
                        console.log(`DEBT RECOVERY: Recovered R${recoveredAmount} debt for store ${storeId}. Logging to ledger.`);
                        const { error: ledgerError } = await supabaseAdmin
                            .from('store_ledger')
                            .insert({
                                store_id: storeId,
                                type: 'payout_deduction',
                                amount: -recoveredAmount, // Negative pays off the debt
                                order_id: order.id,
                                description: `Automatic debt recovery from Order #${order.id}`
                            });

                        if (ledgerError) console.error('DEBT RECOVERY ERROR: Failed to log debt recovery in ledger:', ledgerError);
                        else console.log('DEBT RECOVERY SUCCESS: Ledger updated successfully.');
                    } else {
                        console.log(`DEBT RECOVERY: Already recovered debt for order ${order.id}. Skipping.`);
                    }
                }
            }
        }

        // 4. Return Status
        return new Response(
            JSON.stringify({
                success: true,
                status: status, // 'success', 'failed', 'abandoned'
                data: data
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error: any) {
        console.error('Verify Error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
