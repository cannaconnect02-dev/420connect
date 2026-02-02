
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRadiusLimit() {
    console.log("Testing 30km limit...");

    // 0. Sign In
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'merchant_test@test.com',
        password: 'Herbsway123!'
    });

    if (authError || !session) {
        console.error("Auth failed:", authError);
        return;
    }

    const merchantId = session.user.id;

    // 1. Get Restaurant (Cape Town)
    const { data: restaurant } = await supabase.from('restaurants').select('id, location').eq('owner_id', merchantId).single();

    // 2. Try to create order in Paarl (~55km away)
    // Coords: 18.96, -33.72
    const farLocation = 'POINT(18.96 -33.72)';

    const orderData = {
        created_at: new Date().toISOString(),
        total_amount: 100,
        status: 'pending',
        delivery_address: 'Paarl, Western Cape',
        delivery_location: farLocation,
        customer_id: merchantId,
        restaurant_id: restaurant.id
    };

    const { data, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

    if (error) {
        console.log("EXPECTED ERROR caught:");
        console.log(error.message); // Should say "Delivery address is too far..."
    } else {
        console.error("FAILED: Order was created but should have been blocked!", data.id);
    }
}

testRadiusLimit();
