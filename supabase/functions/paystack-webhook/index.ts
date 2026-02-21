import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Webhooks are POST
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
        if (!PAYSTACK_SECRET_KEY) throw new Error('Configuration Error');

        // 1. Validate Signature
        const signature = req.headers.get('x-paystack-signature');
        if (!signature) {
            return new Response('No signature', { status: 400 });
        }

        const bodyText = await req.text();

        // Compute HMAC SHA512
        const key = new TextEncoder().encode(PAYSTACK_SECRET_KEY);
        const data = new TextEncoder().encode(bodyText);

        const hmac = await crypto.subtle.importKey(
            "raw", key, { name: "HMAC", hash: "SHA-512" }, false, ["sign", "verify"]
        );
        const signatureBuffer = await crypto.subtle.sign("HMAC", hmac, data);
        const signatureHex = Array.from(new Uint8Array(signatureBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        if (signatureHex !== signature) {
            console.error('Invalid Signature');
            return new Response('Invalid Signature', { status: 401 });
        }

        const event = JSON.parse(bodyText);
        const { event: eventType, data: eventData } = event;

        console.log(`Received Webhook: ${eventType}`, eventData.reference);

        // 2. Init Supabase
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 3. Handle Events
        if (eventType === 'charge.success') {
            const reference = eventData.reference;
            const amount = eventData.amount / 100; // Convert back to base currency

            // Check Idempotency
            const { data: order } = await supabaseAdmin
                .from('orders')
                .select('id, paystack_payment_status, customer_id')
                .eq('paystack_reference', reference)
                .single();

            if (order) {
                if (order.paystack_payment_status === 'charged' || order.paystack_payment_status === 'refunded') {
                    console.log('Order already processed, skipping.');
                    return new Response('Ok', { status: 200 });
                }

                // Update Order
                await supabaseAdmin
                    .from('orders')
                    .update({
                        paystack_payment_status: 'charged',
                        paystack_transaction_id: String(eventData.id)
                    })
                    .eq('id', order.id);

                // Save Payment Method (Reusable Authorization)
                if (eventData.authorization && eventData.authorization.reusable) {
                    const auth = eventData.authorization;

                    // Check if already exists
                    const { data: existingPm } = await supabaseAdmin
                        .from('payment_methods')
                        .select('id')
                        .eq('paystack_authorization_code', auth.authorization_code)
                        .eq('user_id', order.customer_id)
                        .single();

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
                            console.log('Payment Method Saved');
                            await supabaseAdmin.from('orders').update({ payment_method_id: newPm.id }).eq('id', order.id);
                        }
                    } else {
                        await supabaseAdmin.from('orders').update({ payment_method_id: existingPm.id }).eq('id', order.id);
                    }
                }

                // --- Handle Store Ledger Debt Recovery ---
                let metadata = eventData.metadata;

                // Paystack metadata can sometimes be a string
                if (typeof metadata === 'string') {
                    try {
                        metadata = JSON.parse(metadata);
                    } catch (e) {
                        console.error('Failed to parse metadata string:', metadata);
                        metadata = {};
                    }
                }

                console.log('Processed Metadata:', JSON.stringify(metadata));

                if (metadata && metadata.debt_recovered && metadata.store_id) {
                    const recoveredAmount = Number(metadata.debt_recovered);
                    const storeId = metadata.store_id;

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

                    if (ledgerError) {
                        console.error('DEBT RECOVERY ERROR: Failed to log debt recovery in ledger:', ledgerError);
                    } else {
                        console.log('DEBT RECOVERY SUCCESS: Ledger updated successfully.');
                    }
                } else {
                    console.log('DEBT RECOVERY: No recovery data found in metadata.', {
                        hasMetadata: !!metadata,
                        hasDebtRecovered: !!(metadata && metadata.debt_recovered),
                        hasStoreId: !!(metadata && metadata.store_id)
                    });
                }
            } else {
                console.warn('Order not found for reference:', reference);
            }

        } else if (eventType === 'refund.processed') {
            // Paystack can send transaction_id OR transaction.id
            const transactionId = String(
                eventData.transaction?.id ||
                eventData.transaction_id ||
                eventData.id
            );

            console.log(`Processing refund webhook for transaction: ${transactionId}`);

            const { error: updateError } = await supabaseAdmin
                .from('orders')
                .update({ paystack_payment_status: 'refunded' })
                .eq('paystack_transaction_id', transactionId);

            if (updateError) {
                console.error('Failed to update order status from refund webhook:', updateError);
            } else {
                console.log('Order marked as Refunded via Webhook');
            }

        } else if (eventType === 'transfer.reversed') {
            // Handle if needed
        }

        return new Response('Ok', { status: 200 });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return new Response('Server Error', { status: 500 });
    }
});
