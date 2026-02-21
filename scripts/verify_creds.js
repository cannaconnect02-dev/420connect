
const { createClient } = require('@supabase/supabase-js');

// Config from previous files
const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CREDENTIALS = [
    { role: 'Admin', email: 'admin@marketplace.com', password: 'Admin123!' },
    { role: 'Driver', email: 'driver_test@test.com', password: 'Driver123!' },
    { role: 'Customer', email: 'customer_test@test.com', password: 'password123' },
    { role: 'Merchant', email: 'merchant_test@test.com', password: 'password123' },
    { role: 'Driver (Codebase)', email: 'driver_force@gmail.com', password: 'password123' }
];

async function verifyCredentials() {
    console.log("Verifying Credentials...");

    for (const cred of CREDENTIALS) {
        console.log(`\nTesting ${cred.role}: ${cred.email}`);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: cred.email,
                password: cred.password
            });

            if (error) {
                console.log(`❌ Failed: ${error.message}`);
            } else {
                console.log(`✅ Success! User ID: ${data.user.id}`);
                // Optional: Check profile role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();
                console.log(`   Profile Role: ${profile ? profile.role : 'No profile found'}`);
            }
        } catch (e) {
            console.log(`❌ Exception: ${e.message}`);
        }
    }
}

verifyCredentials();
