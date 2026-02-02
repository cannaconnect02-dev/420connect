
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectProfiles() {
    console.log("Inspecting Profiles...");

    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, store_name, store_type')
        .ilike('store_name', '%Herbs%');

    if (error) {
        console.log("Error:", error.message);
    } else {
        console.log("Found Profiles matching 'Herbs':", data);
    }

    // Check confirmed users if possible? (Can't list users with anon key)
    // Try login with User provided creds
    const creds = [
        { email: 'merchant_test@test.com', pass: 'Herbsway123!' },
        { email: 'customer_test@test.com', pass: 'Customer123!' }
    ];

    for (const c of creds) {
        const { data: auth, error: login } = await supabase.auth.signInWithPassword({
            email: c.email,
            password: c.pass
        });
        console.log(`Login ${c.email}: ${login ? login.message : (auth.user ? 'Success ' + auth.user.id : 'Failed')}`);
    }
}

inspectProfiles();
