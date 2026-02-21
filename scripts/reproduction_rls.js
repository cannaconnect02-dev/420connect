
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CUSTOMER = { email: 'customer_test@test.com', password: 'Customer123!' };

async function reproduceError() {
    console.log(`\nLogging in as ${CUSTOMER.email}...`);
    const { data: auth, error: loginError } = await supabase.auth.signInWithPassword(CUSTOMER);

    if (loginError) {
        console.error("Login Failed:", loginError.message);
        return;
    }
    const customerId = auth.user.id;
    console.log(`Logged in. ID: ${customerId}`);

    // Attempt to create a dummy order
    // Need a valid restaurant ID first
    const { data: restaurants } = await supabase.from('restaurants').select('id').limit(1);
    const restaurantId = restaurants[0]?.id;

    if (!restaurantId) {
        console.error("No restaurants found to order from.");
        return;
    }

    console.log(`Attempting to insert order for Restaurant: ${restaurantId}`);

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            customer_id: customerId,
            restaurant_id: restaurantId,
            total_amount: 10.00,
            status: 'pending',
            delivery_address: '123 Test St'
        })
        .select();

    if (orderError) {
        console.log(`\n❌ ERROR REPRODUCED: ${orderError.message}`);
    } else {
        console.log(`\n✅ SUCCESS (Unexpected?): Order created`, order);
    }
}

reproduceError();
