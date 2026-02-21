const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runTrace() {
    console.log('Fetching a target order to trace...');
    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1);

    if (!orders || orders.length === 0) {
        console.log('No order found.');
        return;
    }

    const targetOrder = orders[0];
    console.log(`Target Order: ${targetOrder.id}, Status: ${targetOrder.status}`);

    console.log('Subscribing to realtime for this order...');
    const channel = supabase.channel('db-trace')
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${targetOrder.id}` },
            (payload) => {
                console.log(`[REALTIME UPDATE] Status changed to: ${payload.new.status}, cancelled_by: ${payload.new.cancelled_by}, paystack_status: ${payload.new.paystack_payment_status}`);
            }
        )
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Subscribed. Triggering cancellation in 2 seconds...');
                setTimeout(async () => {
                    console.log('--- Executing DB Update ---');
                    const { error } = await supabase
                        .from('orders')
                        .update({ status: 'cancelled', cancelled_by: 'merchant' })
                        .eq('id', targetOrder.id);
                    if (error) console.error('DB Update error:', error);
                    else console.log('DB Update triggered successfully.');
                }, 2000);
            }
        });

    // Wait 10 seconds to collect traces
    setTimeout(() => {
        console.log('Trace complete. Unsubscribing.');
        supabase.removeChannel(channel);
        process.exit(0);
    }, 12000);
}

runTrace();
