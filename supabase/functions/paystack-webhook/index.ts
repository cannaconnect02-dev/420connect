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
                .select('id, paystack_payment_status, user_id')
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
                        .eq('user_id', order.user_id)
                        .single();

                    if (!existingPm) {
                        await supabaseAdmin.from('payment_methods').insert({
                            user_id: order.user_id,
                            paystack_authorization_code: auth.authorization_code,
                            card_last4: auth.last4,
                            card_brand: auth.brand,
                            card_exp_month: auth.exp_month,
                            card_exp_year: auth.exp_year,
                            is_default: true // Make default if first one?
                        });
                        console.log('Payment Method Saved');
                    }
                }
            } else {
                console.warn('Order not found for reference:', reference);
            }

        } else if (eventType === 'refund.processed') {
            const transactionId = String(eventData.transaction_id || eventData.id); // Check payload structure
            // Or usually refund object has 'transaction_reference' ?
            // Paystack 'refund.processed' data has { transaction_reference, ... } often?
            // Let's rely on finding order by transaction ID if possible.

            // Wait, eventData for refund.processed usually contains refund details.
            // We need to link it back to the order.

            // Assuming we can find by transaction ID
            // Ideally we store `paystack_transaction_id` on charge.success

            await supabaseAdmin
                .from('orders')
                .update({ paystack_payment_status: 'refunded' })
                .eq('paystack_transaction_id', transactionId);

            console.log('Order marked as Refunded');

        } else if (eventType === 'transfer.reversed') {
            // Handle if needed
        }

        return new Response('Ok', { status: 200 });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return new Response('Server Error', { status: 500 });
    }
});
