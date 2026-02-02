
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkMerchant() {
    console.log("Checking Merchant Profile...");

    // ID from previous step
    const userId = '5908e6ac-f841-47fe-9ca7-15047bb06735';

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.log("Error fetching profile:", error.message);
    } else {
        console.log("Merchant Profile:", profile);
    }

    // Check restaurants table too
    const { data: restaurant, error: rError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', userId);

    if (rError) {
        console.log("Error fetching restaurant:", rError.message);
    } else {
        console.log("Merchant Restaurant:", restaurant);
    }
}

checkMerchant();
