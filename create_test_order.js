
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createTestOrder() {
    console.log("Starting test order creation...");

    // 0. Sign In
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'merchant_test@test.com',
        password: 'Herbsway123!'
    });

    if (authError || !session) {
        console.error("Auth failed:", authError);
        return;
    }
    console.log("Signed in as merchant/customer");

    const merchantId = session.user.id;

    // 1. Get Restaurant
    const { data: restaurant, error: rError } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('owner_id', merchantId)
        .single();

    if (rError) {
        console.error("Error fetching restaurant:", rError);
        return;
    }
    console.log(`Found restaurant: ${restaurant.name} (${restaurant.id})`);

    // 2. Get a Menu Item
    const { data: menuItems, error: mError } = await supabase
        .from('menu_items')
        .select('id, name, price')
        .eq('restaurant_id', restaurant.id)
        .limit(1);

    if (mError || !menuItems.length) {
        console.error("Error fetching menu items:", mError);
        // Create a dummy menu item if none exists?
        // Let's assume there is one for now, or fail.
        return;
    }
    const menuItem = menuItems[0];
    console.log(`Found menu item: ${menuItem.name} (${menuItem.price})`);

    // 3. Create Order
    // Use the merchant ID as customer ID for simplicity, or find another profile
    const { data: profiles } = await supabase.from('profiles').select('id').neq('id', merchantId).limit(1);
    const customerId = profiles && profiles.length > 0 ? profiles[0].id : merchantId;

    console.log(`Using customer ID: ${customerId}`);

    const orderData = {
        created_at: new Date().toISOString(),
        total_amount: menuItem.price,
        status: 'pending',
        delivery_address: '123 Test St, Cape Town',
        // Coordinate approx 3km from CBD: -33.93, 18.41
        delivery_location: 'POINT(18.41 -33.93)',
        customer_id: customerId,
        restaurant_id: restaurant.id
    };

    // Check schema for correct column names if needed. previous views showed 'store_owner_id' in orders table.
    // 'restaurant_id' might not exist on orders table based on previous context, usually it's there.
    // Let's check keys of orderData against potential schema errors or just try.

    const { data: order, error: oError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

    if (oError) {
        console.error("Error creating order:", oError);
        return;
    }
    console.log(`Created Order: ${order.id}`);

    // 4. Create Order Item
    const { error: oiError } = await supabase
        .from('order_items')
        .insert({
            order_id: order.id,
            menu_item_id: menuItem.id,
            quantity: 1,
            price_at_time: menuItem.price
        });

    if (oiError) {
        console.error("Error creating order item:", oiError);
    } else {
        console.log("Created Order Item successfully");
    }
}

createTestOrder();
