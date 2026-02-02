
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fekngijfsctclvsezgaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZla25naWpmc2N0Y2x2c2V6Z2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTMxNTQsImV4cCI6MjA4NDI2OTE1NH0.0tXGQox5T3IgTgL-H4jIEhNBZjV8rz-RYUWzpEbnj8M';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Use unique suffix to avoid "user already exists" errors
const SUFFIX = Date.now().toString().slice(-6);
const MERCHANT_EMAIL = `merchant_${SUFFIX}@nanobanana.com`;
const DRIVER_EMAIL = `driver_${SUFFIX}@nanobanana.com`;
const CUSTOMER_EMAIL = `customer_${SUFFIX}@nanobanana.com`;
const PASSWORD = 'Password123!';

async function runFullFlow() {
    console.log('🚀 Starting Full Functional Flow Test...');

    try {
        // 1. REGISTER MERCHANT
        console.log('\n--- 1. Merchant Setup ---');
        const { data: merchantAuth, error: mError } = await supabase.auth.signUp({
            email: MERCHANT_EMAIL,
            password: PASSWORD,
            options: { data: { role: 'merchant', full_name: 'Big Banana' } }
        });
        if (mError) throw mError;
        const merchantId = merchantAuth.user.id;
        console.log(`✅ Merchant Registered: ${MERCHANT_EMAIL}`);

        // Create Restaurant (Note: Requires a session for standard RLS, but if public insert is on for testing we use it)
        const { data: restaurant, error: rError } = await supabase.from('restaurants').insert({
            owner_id: merchantId,
            name: 'The Electric Banana',
            description: 'The best smoothies in town',
            location: 'POINT(28.2293 -25.7479)', // Pretoria coords
            address: '123 Neon Road'
        }).select().single();
        if (rError) {
            console.warn('⚠️ Restaurant creation failed (likely RLS). Msg:', rError.message);
            // We might need to manually insert via SQL if RLS blocks public insert
        } else {
            console.log(`✅ Restaurant Created: ${restaurant.id}`);

            // Add Menu Item
            const { data: item, error: iError } = await supabase.from('menu_items').insert({
                restaurant_id: restaurant.id,
                name: 'Electric Green Smoothie',
                price: 45.00,
                description: 'Packed with electrolytes and green energy'
            }).select().single();
            if (iError) console.warn('⚠️ Menu item creation failed:', iError.message);
            else console.log(`✅ Menu Item Added: ${item.name}`);
        }

        // 2. REGISTER DRIVER (Pending -> Active)
        console.log('\n--- 2. Driver Setup ---');
        const { data: driverAuth, error: dError } = await supabase.auth.signUp({
            email: DRIVER_EMAIL,
            password: PASSWORD,
            options: { data: { role: 'driver', full_name: 'Speedy Sam', age: 24 } }
        });
        if (dError) throw dError;
        const driverId = driverAuth.user.id;
        console.log(`✅ Driver Registered: ${DRIVER_EMAIL} (Status: Pending)`);

        // 3. REGISTER CUSTOMER
        console.log('\n--- 3. Customer Action ---');
        const { data: customerAuth, error: cError } = await supabase.auth.signUp({
            email: CUSTOMER_EMAIL,
            password: PASSWORD,
            options: { data: { role: 'customer', full_name: 'Hungry Harry' } }
        });
        if (cError) throw cError;
        const customerId = customerAuth.user.id;
        console.log(`✅ Customer Registered: ${CUSTOMER_EMAIL}`);

        console.log('\n--- ⚠️ STOP: Need Manual Approval / Setup via Agent Tools ---');
        console.log(`MerchantID: ${merchantId}`);
        console.log(`DriverID: ${driverId}`);
        console.log(`CustomerID: ${customerId}`);
        console.log(`RestaurantID: ${restaurant?.id}`);

    } catch (err) {
        console.error('❌ Flow Test Failed:', err.message);
    }
}

runFullFlow();
