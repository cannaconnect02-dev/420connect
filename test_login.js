import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Testing login...");
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'merchant_test@test.com',
        password: 'password123'
    });

    if (error) {
        console.error("Login Error:", error.message);
    } else {
        console.log("Login Success! User ID:", data.user?.id);
    }
}

test();
