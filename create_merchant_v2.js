
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createMerchantUnique() {
    // 1. Re-verify the known one
    console.log("--- Checking Existing ---");
    const { error: oldError } = await supabase.auth.signInWithPassword({
        email: 'merchant_test@test.com',
        password: 'Herbsway123!'
    });
    if (!oldError) console.log("✅ Verified 'merchant_test@test.com' works with 'Herbsway123!'");
    else console.log("❌ 'merchant_test' check failed:", oldError.message);

    // 2. Create Fresh One
    console.log("--- Creating New ---");
    const email = `merchant_alpha_${Date.now()}@test.com`; // Unique timestamp
    const password = 'password123';

    console.log(`Attempting: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                role: 'merchant',
                full_name: 'Alpha Merchant'
            }
        }
    });

    if (error) {
        console.error("❌ SignUp Error:", error.message);
        if (error.message.includes('rate limit')) {
            console.log("⚠️ RATE LIMITED. Cannot create new users.");
        }
    } else {
        console.log(`✅ SUCCESS! Created: ${email}`);
        console.log(`Password: ${password}`);

        // Create Restaurant
        await supabase.from('restaurants').insert({
            owner_id: data.user.id,
            name: 'Alpha Burger',
            address: '100 Alpha Way',
            location: 'POINT(18.42 -33.92)'
        });
        console.log("✅ Alpha Restaurant Created");
    }
}

createMerchantUnique();
