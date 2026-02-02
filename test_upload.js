
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUpload() {
    console.log("Testing upload...");

    // Sign in
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'merchant_test@test.com',
        password: 'Herbsway123!'
    });

    if (authError || !session) {
        console.error("Auth failed:", authError);
        return;
    }

    const userId = session.user.id;
    const fileName = `${userId}/test.txt`;

    const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, 'Hello World', { upsert: true });

    if (error) {
        console.error("Upload Error:", error);
    } else {
        console.log("Upload Success:", data);

        // Test Public URL
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
        console.log("Public URL:", publicUrl);
    }
}

testUpload();
