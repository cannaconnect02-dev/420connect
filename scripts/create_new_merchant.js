
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createMerchant() {
    console.log("Creating NEW merchant...");
    const email = 'merchant_dev@test.com';
    const password = 'password123';

    // 1. Sign Up
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                role: 'merchant',
                full_name: 'Dev Merchant'
            }
        }
    });

    if (error) {
        // If "already registered", try signing in
        if (error.message.includes('already registered') || error.status === 429) {
            console.log("User might exist (or rate limited). Trying login...");
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email, password
            });
            if (loginError) {
                console.error("❌ Login Failed:", loginError.message);
                return;
            }
            console.log("✅ Login SUCCESS for Existing User:", loginData.user.id);
            return;
        }
        console.error("❌ SignUp Error:", error.message);
        return;
    }

    console.log("✅ Merchant Created:", data.user.id);

    // 2. Create a Restaurant for them immediately so they land on Dashboard, not "Add Restaurant"
    const { error: restError } = await supabase.from('restaurants').insert({
        owner_id: data.user.id,
        name: 'Dev Burger Joint',
        address: '123 Dev St',
        location: 'POINT(18.42 -33.92)' // Cape Town
    });

    if (restError) console.error("⚠️ Failed to create default restaurant:", restError.message);
    else console.log("✅ Default Restaurant Created");
}

createMerchant();
