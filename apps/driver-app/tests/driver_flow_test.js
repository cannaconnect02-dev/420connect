
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fekngijfsctclvsezgaq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZla25naWpmc2N0Y2x2c2V6Z2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTMxNTQsImV4cCI6MjA4NDI2OTE1NH0.0tXGQox5T3IgTgL-H4jIEhNBZjV8rz-RYUWzpEbnj8M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDriverFlowTest() {
    console.log('--- STARTING DRIER FLOW TEST ---');

    // 1. Authenticate as Driver
    console.log('1. Authenticating as Driver...');
    const email = 'driver_demo_1@gmail.com';
    const password = 'password123';

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error('Login failed:', authError.message);
        return;
    }
    console.log('Driver logged in:', authData.user.id);

    // 2. Find an available order (simulating "Radar")
    console.log('2. Finding available order...');
    let orderId = null;

    // First try to find one ready for pickup
    const { data: availableOrders } = await supabase
        .from('driver_orders_view')
        .select('*')
        .limit(1);

    if (availableOrders && availableOrders.length > 0) {
        orderId = availableOrders[0].id;
        console.log('Found order ready for pickup:', orderId);
    } else {
        // If no order, we might need to create one or force one to be ready (mocking for test)
        // For now, let's assume one exists or try to find a pending one and update it
        // Note: As driver I can't update pending -> ready_for_pickup, that's merchant/system.
        // We will skip if none found.
        console.warn('No orders found in driver_orders_view (status=ready_for_pickup). Test might need setup.');
        return;
    }

    // 3. Accept Order (Simulate index.tsx logic)
    console.log(`3. Accepting Order ${orderId}...`);
    const { error: acceptError } = await supabase
        .from('orders')
        .update({
            status: 'accepted',
            driver_id: authData.user.id
        })
        .eq('id', orderId);

    if (acceptError) {
        console.error('Accept failed:', acceptError.message);
        return;
    }
    console.log('Order accepted. Status should be "accepted".');

    // 4. Verify Status
    const { data: orderAfterAccept } = await supabase
        .from('orders')
        .select('status, driver_id')
        .eq('id', orderId)
        .single();

    console.log('Status after accept:', orderAfterAccept.status);
    if (orderAfterAccept.status !== 'accepted' || orderAfterAccept.driver_id !== authData.user.id) {
        console.error('Verification FAILED: Status or Driver ID mismatch.');
        return;
    } else {
        console.log('Verification PASSED.');
    }

    // 5. Pickup Order (Simulate deliveries.tsx logic)
    console.log('5. Picking up order...');
    const { error: pickupError } = await supabase
        .from('orders')
        .update({ status: 'picked_up' })
        .eq('id', orderId);

    if (pickupError) {
        console.error('Pickup failed:', pickupError.message);
        return;
    }
    console.log('Order marked picked_up.');

    // 6. Complete Delivery (Simulate deliveries.tsx logic)
    console.log('6. Completing delivery...');
    const { error: completeError } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);

    if (completeError) {
        console.error('Completion failed:', completeError.message);
        return;
    }
    console.log('Order marked delivered.');

    console.log('--- TEST COMPLETED SUCCESSFULLY ---');
}

runDriverFlowTest();
