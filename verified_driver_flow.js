
const { createClient } = require('@supabase/supabase-js');

// Config
const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DRIVER_EMAIL = 'driver_test@test.com';
const DRIVER_PASSWORD = 'Driver123!';

async function runDriverTest() {
    console.log(`\n🚀 Starting Verified Driver Flow for: ${DRIVER_EMAIL}\n`);

    try {
        // 1. Login
        console.log("1️⃣  Logging in...");
        const { data: auth, error: loginError } = await supabase.auth.signInWithPassword({
            email: DRIVER_EMAIL,
            password: DRIVER_PASSWORD
        });

        if (loginError) throw new Error(`Login failed: ${loginError.message}`);
        const userId = auth.user.id;
        console.log(`   ✅ Logged in. User ID: ${userId}`);

        // 2. Check Profile Status
        console.log("2️⃣  Checking Profile...");
        const { data: profile } = await supabase
            .from('profiles')
            .select('status, role')
            .eq('id', userId)
            .single();

        console.log(`   ℹ️  Profile Role: ${profile.role}, Status: ${profile.status}`);

        if (profile.role !== 'driver') {
            throw new Error(`User is not a driver! Role: ${profile.role}`);
        }

        // 3. Find Available Order (if any)
        console.log("3️⃣  Checking for Available Orders...");
        // Note: 'driver_orders_view' usually shows available orders.
        // Assuming we look for 'ready_for_pickup' or similar.
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .in('status', ['ready_for_pickup', 'preparing']) // Just to see what's there
            .limit(5);

        if (ordersError) {
            console.log(`   ⚠️  Error fetching orders: ${ordersError.message}`);
        } else if (orders.length === 0) {
            console.log("   ℹ️  No 'ready_for_pickup' orders found.");
            // Optional: Create a test order if we had a working merchant/customer account, 
            // but we don't right now.
        } else {
            console.log(`   ✅ Found ${orders.length} orders.`);
            console.log(orders);
        }

        console.log("\n✅ Test Complete (Login & Profile Verified).");

    } catch (e) {
        console.error("\n❌ TEST FAILED:", e.message);
        process.exit(1);
    }
}

runDriverTest();
