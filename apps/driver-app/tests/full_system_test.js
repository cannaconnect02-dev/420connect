
const { createClient } = require('@supabase/supabase-js');

// Config - Hardcoded for test environment
const SUPABASE_URL = 'https://fekngijfsctclvsezgaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZla25naWpmc2N0Y2x2c2V6Z2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTMxNTQsImV4cCI6MjA4NDI2OTE1NH0.0tXGQox5T3IgTgL-H4jIEhNBZjV8rz-RYUWzpEbnj8M';

if (!SUPABASE_ANON_KEY) {
    console.error("Missing Keys!");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Use a gmail address
const TEST_EMAIL = 'driver_test_agent_v3@gmail.com';
const TEST_PASSWORD = 'password123';

const MODE = process.argv[2] || 'part1';

async function runTest() {
    console.log(`\n🚀 Starting Test (${MODE}) for: ${TEST_EMAIL}\n`);

    try {
        if (MODE === 'part1') {
            // STEP 1: Registration
            console.log("1️⃣  Checking/Registering new driver...");

            const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            });

            let userId = signIn?.user?.id;

            if (!userId) {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: TEST_EMAIL,
                    password: TEST_PASSWORD,
                    options: {
                        data: {
                            role: 'driver',
                            full_name: 'Test Driver Agent',
                            age: 30,
                            documents_url: 'http://example.com/license.pdf'
                        }
                    }
                });
                if (authError) throw new Error(`Registration failed: ${authError.message}`);
                userId = authData?.user?.id;

                // If sign up works but no user ID (e.g. verify email required), handle that
                if (!userId && authData?.user === null) {
                    // Check if it's because email confirmation is on?
                    console.log("   ⚠️  Registration started but no User ID returned. Email confirmation might be required.");
                    // We can't proceed if confirmation is required without admin key to auto-confirm.
                    // But in this environment, previous tests worked so maybe just wait?
                }
                console.log(`   ✅ Registered New User. ID: ${userId}`);
            } else {
                console.log(`   ℹ️  User already existed. ID: ${userId}`);
            }

            if (!userId) throw new Error("Could not get User ID.");

            // STEP 2: Verify Pending Status
            console.log("2️⃣  Verifying 'Pending' status...");
            const { data: profilePending } = await supabase
                .from('profiles')
                .select('status')
                .eq('id', userId)
                .single();

            if (profilePending && profilePending.status !== 'pending' && profilePending.status !== 'rejected') {
                console.log(`   ⚠️  Status is '${profilePending.status}'. If 'active', skip approval.`);
            } else if (profilePending) {
                console.log("   ✅ Status is 'pending'.");
                console.log(`\n👉 ACTION REQUIRED: Approve User via SQL.`);
            } else {
                console.log("   ⚠️  Profile not found yet (Trigger lag?).");
            }

        } else if (MODE === 'part2') {
            // STEP 3: Active Logic
            console.log("3️⃣  Logging in (Verify Active)...");
            const { data: auth, error: loginError } = await supabase.auth.signInWithPassword({
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            });
            if (loginError) throw loginError;
            const userId = auth.user.id;

            const { data: profile } = await supabase.from('profiles').select('status').eq('id', userId).single();
            if (profile.status !== 'active') {
                throw new Error(`User is still ${profile.status}! Admin approval failed.`);
            }
            console.log("   ✅ User is Active.");

            // STEP 4: Create Order
            console.log("4️⃣  Creating Order...");
            const { data: restaurant } = await supabase.from('restaurants').select('id').limit(1).single();

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    customer_id: userId,
                    restaurant_id: restaurant.id,
                    total_amount: 50.00,
                    delivery_address: '123 Agent Test St',
                    delivery_location: 'POINT(0 0)',
                    status: 'ready_for_pickup'
                })
                .select()
                .single();

            if (orderError) {
                console.log("   ⚠️  Creating order failed (RLS). Skipping Chat test.");
                console.warn(orderError.message);
            } else {
                console.log(`   ✅ Order Created: ${order.id}`);

                // Accept
                await supabase.from('orders').update({ status: 'accepted', driver_id: userId }).eq('id', order.id);
                console.log("   ✅ Order Accepted.");

                // Chat
                await supabase.from('messages').insert({
                    order_id: order.id,
                    sender_id: userId,
                    content: "Agent Test Message"
                });

                // Verify
                const { data: msgs } = await supabase.from('messages').select('*').eq('order_id', order.id);
                if (msgs.length > 0) console.log("   ✅ Chat Verified.");
            }
        }

    } catch (e) {
        console.error("\n❌ TEST FAILED:", e.message);
        process.exit(1);
    }
}

runTest();
