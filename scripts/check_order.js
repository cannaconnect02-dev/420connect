require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUri = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUri || !supabaseKey) {
    console.error("Missing SUPABASE_URL or Key in env", Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(supabaseUri, supabaseKey);

async function checkOrder() {
    console.log("Fetching latest order...");
    const { data: order, error } = await supabase
        .from('orders')
        .select(`
            id, total_amount, delivery_fee, paystack_payment_status,
            order_items ( id, price_at_time, markup_at_time, quantity )
        `)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error("Error:", error);
        return;
    }
    console.log(JSON.stringify(order, null, 2));
}

checkOrder();
