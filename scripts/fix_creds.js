
const { createClient } = require('@supabase/supabase-js');

// Config
const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USERS_TO_CREATE = [
    { email: 'customer_test@test.com', password: 'password123', role: 'customer' },
    { email: 'merchant_test@test.com', password: 'password123', role: 'merchant' }
];

async function fixCredentials() {
    console.log("Fixing Credentials...");

    for (const user of USERS_TO_CREATE) {
        console.log(`\nCreating/Checking ${user.role}: ${user.email}`);

        // Try login first
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: user.password
        });

        if (!loginError) {
            console.log(`   ✅ User already exists and login works. ID: ${loginData.user.id}`);
            continue;
        }

        console.log(`   Login failed (${loginError.message}). Attempting Sign Up...`);

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
            options: {
                data: {
                    role: user.role,
                    full_name: `${user.role} Test User`
                }
            }
        });

        if (signUpError) {
            console.log(`   ❌ Sign Up Failed: ${signUpError.message}`);
        } else {
            if (signUpData.user && !signUpData.session) {
                console.log(`   ⚠️  Sign Up Successful but email confirmation required. ID: ${signUpData.user.id}`);
            } else if (signUpData.user) {
                console.log(`   ✅ Sign Up Successful. ID: ${signUpData.user.id}`);
            }
        }
    }
}

fixCredentials();
