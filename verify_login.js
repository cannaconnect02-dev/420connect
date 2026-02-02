
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyLogins() {
    console.log("Verifying credentials...");

    // 1. Check Merchant
    const { data: mData, error: mError } = await supabase.auth.signInWithPassword({
        email: 'merchant_test@test.com',
        password: 'Herbsway123!'
    });

    if (mError) {
        console.log("❌ Merchant Login FAILED:", mError.message);
    } else {
        console.log("✅ Merchant Login SUCCESS (User ID: " + mData.session.user.id + ")");
    }

    // 2. Check Driver Force (Option A)
    const { error: dErrorA } = await supabase.auth.signInWithPassword({
        email: 'driver_force@gmail.com',
        password: 'password123'
    });
    if (!dErrorA) console.log("✅ Driver (force/pass123) SUCCESS");

    // 3. Check Driver Force (Option B)
    const { error: dErrorB } = await supabase.auth.signInWithPassword({
        email: 'driver_force@gmail.com',
        password: 'Herbsway123!'
    });
    if (!dErrorB) console.log("✅ Driver (force/Herbsway) SUCCESS");

    // 4. Check Driver Test
    const { error: dErrorC } = await supabase.auth.signInWithPassword({
        email: 'driver_test@test.com',
        password: 'password123'
    });
    if (!dErrorC) console.log("✅ Driver (test/pass123) SUCCESS");
}

verifyLogins();
