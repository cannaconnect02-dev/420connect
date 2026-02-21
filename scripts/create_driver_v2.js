
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createDriver() {
    console.log("Creating driver...");
    const email = 'driver_final@test.com';
    const password = 'password123';

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                role: 'driver',
                full_name: 'Final Driver'
            }
        }
    });

    if (error) {
        console.error("SignUp Error:", error);
    } else {
        console.log("✅ Driver Created:", email);
        // Verify immediately
        const { error: loginError } = await supabase.auth.signInWithPassword({
            email, password
        });
        if (!loginError) console.log("✅ Login Verified");
        else console.error("❌ Login Verification Failed:", loginError);
    }
}

createDriver();
