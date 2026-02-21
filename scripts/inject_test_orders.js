const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseAdmin = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function injectOrders() {
    console.log('Fetching stores...');
    const { data: stores } = await supabaseAdmin.from('stores').select('id, name');

    // Pick a random customer profile ID (must exist in profiles)
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, preferred_name').limit(1);
    const customerId = profiles[0].id;
    const customerName = profiles[0].preferred_name || 'System Test User';

    let count = 0;
    for (const store of stores) {
        const { error } = await supabaseAdmin.from('orders').insert({
            store_id: store.id,
            customer_id: customerId,
            total_amount: Math.floor(Math.random() * 100) + 50,
            status: 'pending'
            // NOT sending cancelled_by or customer_name to avoid triggering missing column errors if cache is stale
        });

        if (error) {
            console.error(`Failed to insert for store ${store.name}:`, error.message);
        } else {
            console.log(`Successfully injected 'pending' order for store: ${store.name} (${store.id})`);
            count++;
        }
    }

    console.log(`\nInjected ${count} test orders across all stores. Please check the merchant portal now.`);
}

injectOrders();
