
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createDriver() {
    console.log("Creating new driver...");

    // 1. Sign Up
    const { data, error } = await supabase.auth.signUp({
        email: 'driver_mvp@test.com',
        password: 'password123',
        options: {
            data: {
                role: 'driver',
                full_name: 'MVP Driver'
            }
        }
    });

    if (error) {
        console.error("SignUp Error:", error.message);
        // If user already exists, try to sign in
        if (error.message.includes('already registered')) {
            console.log("User exists, verifying login...");
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: 'driver_mvp@test.com',
                password: 'password123'
            });
            if (!loginError) console.log("✅ Login Verified for existing user");
            else console.error("❌ Login failed for existing user:", loginError.message);
        }
    } else {
        console.log("✅ Driver Created Successfully:", data.user.id);

        // 2. Ensure Profile Exists (Trigger checks usually handle this, but let's be sure)
        // If trigger didn't fire or role missing, update it.
        // We can't insert into profiles directly if RLS blocks, but we can rely on triggers or the user's token.
    }
}

createDriver();
