
const { createClient } = require('@supabase/supabase-js');

// Config
const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USERS = [
    { role: 'Admin', email: 'admin@marketplace.com', password: 'Admin123!' },
    { role: 'Driver', email: 'driver_test@test.com', password: 'Driver123!' },
    { role: 'Merchant', email: 'merchant_test@test.com', password: 'Herbsway123!' },
    { role: 'Customer', email: 'customer_test@test.com', password: 'Customer123!' }
];

async function runHealthCheck() {
    console.log("🏥 SYSTEM HEALTH CHECK REPORT\n" + "=".repeat(30));

    // 1. User Authentication & Profiles
    console.log("\n1. USER AUTHENTICATION & PROFILES");
    console.log("-".repeat(30));

    for (const user of USERS) {
        process.stdout.write(`Checking ${user.role} (${user.email})... `);
        try {
            const { data: auth, error: loginError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: user.password
            });

            if (loginError) {
                console.log(`❌ FAILED: ${loginError.message}`);
                continue;
            }

            const userId = auth.user.id;

            // Check Profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (!profile) {
                console.log(`⚠️  Auth OK, but NO PROFILE found.`);
                continue;
            }

            let extraInfo = `Role: ${profile.role}`;
            if (user.role === 'Merchant' && profile.store_name) {
                extraInfo += `, Store: ${profile.store_name}`;
            }

            console.log(`✅ OK. ${extraInfo}`);

        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
        }
    }

    // 2. Database Content
    console.log("\n2. DATABASE CONTENT SNAPSHOT");
    console.log("-".repeat(30));

    // Restaurants
    const { count: restaurantCount, error: rError } = await supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true });

    // Active Restaurants (using raw select if column exists, usually is_active)
    const { data: restaurants } = await supabase.from('restaurants').select('name, is_active').limit(5);

    console.log(`Restaurants: ${rError ? '❌ Error' : restaurantCount}`);
    if (restaurants && restaurants.length > 0) {
        restaurants.forEach(r => console.log(`  - ${r.name} (${r.is_active ? 'Active' : 'Inactive'})`));
    }

    // Products
    const { count: productCount, error: pError } = await supabase
        .from('products') // Note: Codebase typically uses 'menu_items' or 'products' - checking schema...
        // Reconstructed schema says 'menu_items', but migration says 'products'. Let's try 'products' first.
        .select('*', { count: 'exact', head: true });

    if (pError) {
        // Fallback to menu_items if products fails
        const { count: menuCount, error: mError } = await supabase.from('menu_items').select('*', { count: 'exact', head: true });
        console.log(`Menu Items: ${mError ? '❌ Error' : menuCount}`);
    } else {
        console.log(`Products: ${productCount}`);
    }

    // Orders
    const { count: orderCount, error: oError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

    console.log(`Total Orders: ${oError ? '❌ Error' : orderCount}`);

    // Recent Orders Status
    const { data: recentOrders } = await supabase
        .from('orders')
        .select('status, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

    if (recentOrders && recentOrders.length > 0) {
        console.log("Recent Orders:");
        recentOrders.forEach(o => console.log(`  - ${o.status}: $${o.total_amount} (${new Date(o.created_at).toISOString().split('T')[0]})`));
    }

    console.log("\n" + "=".repeat(30));
    console.log("END OF REPORT");
}

runHealthCheck();
