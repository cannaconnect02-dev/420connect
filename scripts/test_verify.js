const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testVerify() {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const reference = 'thpoq5louk';

    console.log("Invoking paystack-verify for reference:", reference);

    try {
        const res = await fetch(`${supabaseUrl}/functions/v1/paystack-verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify({ reference })
        });

        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", data);
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

testVerify();
