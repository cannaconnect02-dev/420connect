
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function simulateDriverChat() {
    console.log("Starting chat simulation...");

    // 0. Sign In as Driver (assuming driver_test@test.com exists)
    // Actually, let's look for a valid driver or create one, or just use specific credentials if known.
    // Based on previous logs: driver_test@test.com
    // Let's assume password is 'password123' based on typical patterns, or maybe 'Driver123!'
    // Let's try to fetch an order first to find a valid order ID.

    // Better: Reuse merchant_test because merchant is also 'involved' in orders via restaurant, 
    // BUT the real test is DRIVER. 
    // Let's try to sign in as 'merchant_test' first to see if *they* can chat on an order they own.
    // That proves RLS works for at least one party.

    const email = 'merchant_test@test.com';
    const password = 'Herbsway123!';

    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError || !session) {
        console.error("Auth failed:", authError);
        return;
    }
    console.log(`Signed in as ${email}`);

    // 1. Find an active order for this merchant's restaurant
    // We created an order earlier.
    const merchantId = session.user.id;

    // Get first restaurant
    const { data: restaurant } = await supabase.from('restaurants').select('id').eq('owner_id', merchantId).single();
    if (!restaurant) { console.error("No restaurant found"); return; }

    // Get an order
    const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .limit(1);

    if (!orders || orders.length === 0) {
        console.error("No orders found to chat on.");
        return;
    }

    const orderId = orders[0].id;
    console.log(`Testing chat on Order: ${orderId}`);

    // 2. Send Message
    const content = "Hello customer, your order is being prepared!";

    const { data: msg, error: msgError } = await supabase
        .from('messages')
        .insert({
            order_id: orderId,
            sender_id: merchantId,
            content: content
        })
        .select()
        .single();

    if (msgError) {
        console.error("Error sending message:", msgError);
    } else {
        console.log("Message sent successfully:", msg);
    }
}

simulateDriverChat();
