
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CUSTOMER = { email: 'customer_test@test.com', password: 'Customer123!' };

async function reproduceItemsError() {
    console.log(`\nLogging in as ${CUSTOMER.email}...`);
    const { data: auth, error: loginError } = await supabase.auth.signInWithPassword(CUSTOMER);

    if (loginError) {
        console.error("Login Failed:", loginError.message);
        return;
    }
    const customerId = auth.user.id;
    console.log(`Logged in. ID: ${customerId}`);

    // 1. Get Restaurant and Menu Item
    const { data: restaurants } = await supabase.from('restaurants').select('id').limit(1);
    const restaurantId = restaurants[0]?.id;

    // Note: Checking 'menu_items' vs 'products' table name
    let menuItemId;
    let price = 10.0;

    // Try menu_items first
    const { data: menuItems, error: mError } = await supabase
        .from('menu_items')
        .select('id, price')
        .eq('restaurant_id', restaurantId)
        .limit(1);

    if (menuItems && menuItems.length > 0) {
        menuItemId = menuItems[0].id;
        price = menuItems[0].price;
    } else {
        // Try products
        const { data: products } = await supabase
            .from('products')
            .select('id, price')
            .eq('store_id', restaurantId) // Assuming store_id for products
            .limit(1);

        if (products && products.length > 0) {
            menuItemId = products[0].id;
            price = products[0].price;
        }
    }

    if (!menuItemId) {
        console.log("No menu items/products found. Creating dummy item ID for test (might fail FK constraint if checked immediately, but strictly testing RLS on insert first).");
        // We can't insert a random UUID if FK exists.
        // Let's assume there is at least one product since we saw products count in health check.
        // Let's try to list ANY product.
        const { data: anyProduct } = await supabase.from('products').select('id, price').limit(1);
        if (anyProduct && anyProduct.length > 0) {
            menuItemId = anyProduct[0].id;
            price = anyProduct[0].price;
        } else {
            console.error("CRITICAL: No products found in DB to link to.");
            return;
        }
    }

    console.log(`Target: Restaurant ${restaurantId}, Item ${menuItemId}`);

    // 2. Create Order (This should work now)
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            customer_id: customerId,
            restaurant_id: restaurantId,
            total_amount: price,
            status: 'pending',
            delivery_address: '123 Test St'
        })
        .select()
        .single();

    if (orderError) {
        console.log(`❌ Order Creation Failed: ${orderError.message}`);
        return;
    }
    console.log(`✅ Order Created: ${order.id}`);

    // 3. Create Order Item (This IS EXPECTED TO FAIL)
    console.log("Attempting to insert order_item...");
    const { data: item, error: itemError } = await supabase
        .from('order_items')
        .insert({
            order_id: order.id,
            menu_item_id: menuItemId, // Note: Schema calls it menu_item_id, but if table is products, might be product_id? 
            // Reconstructed schema says 'menu_item_id' in 'order_items' table.
            quantity: 1,
            price_at_time: price
        })
        .select();

    if (itemError) {
        console.log(`\n❌ ERROR REPRODUCED (Expected): ${itemError.message}`);
    } else {
        console.log(`\n✅ SUCCESS (Unexpected): Order Item created`, item);
    }
}

reproduceItemsError();
