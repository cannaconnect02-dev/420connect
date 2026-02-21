
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFetchMessages() {
    console.log("Testing Fetch Messages...");

    // Sign in as Merchant (Owner of the restaurant for the order)
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'merchant_test@test.com',
        password: 'Herbsway123!'
    });

    if (authError || !session) {
        console.error("Auth failed:", authError);
        return;
    }

    const orderId = '2e78ac66-f009-446f-ab1a-f2bc15601401';

    // Fetch
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('order_id', orderId);

    if (error) {
        console.error("Fetch Error:", error);
    } else {
        console.log(`Fetch Success! Found ${data.length} messages.`);
        console.log(data);
    }
}

testFetchMessages();
