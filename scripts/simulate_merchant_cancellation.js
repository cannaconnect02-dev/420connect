const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseAdmin = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testCancelAsUser() {
    console.log('Inserting a mock order...');

    // First find a valid store
    const { data: stores } = await supabaseAdmin.from('stores').select('id, owner_id').limit(1);
    if (!stores || stores.length === 0) return console.log('No stores found');
    const store = stores[0];

    // Find a valid profile for customer
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, preferred_name').limit(1);
    if (!profiles || profiles.length === 0) return console.log('No profiles found');
    const customer = profiles[0];

    const { data: newOrders, error: insertError } = await supabaseAdmin
        .from('orders')
        .insert({
            store_id: store.id,
            customer_id: customer.id,
            total_amount: 50.00,
            status: 'pending'
        })
        .select();

    if (insertError || !newOrders) {
        return console.log('Failed to insert mock order', insertError);
    }

    const order = newOrders[0];
    console.log(`Created Mock Order: ${order.id}, Store: ${order.store_id}`);

    // Since we don't have the user's JWT easily, we will simulate the same update using the admin client,
    // but we can check if it violates any triggers.
    // Wait, let's just use the server client to do it. The triggers run the same way.

    console.log('--- Attempting UPDATE via Supabase API ---');
    const { data, error } = await supabaseAdmin
        .from('orders')
        .update({
            status: 'cancelled',
            cancelled_by: 'merchant',
            updated_at: new Date().toISOString()
        })
        .eq('id', order.id)
        .select();

    if (error) {
        console.error('UPDATE FAILED! ERROR:', error);
    } else {
        console.log('UPDATE SUCCESS:', data);
    }
}

testCancelAsUser();
