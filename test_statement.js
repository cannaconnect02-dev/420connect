require('dotenv').config({ path: 'apps/customer-app/.env' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log("Invoking edge function via raw fetch...")
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-statement`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ store_id: 'a120cf3d-7914-4e0e-a351-8ba158ecffc0', week_start_date: '2024-01-01', week_end_date: '2024-01-07' })
    });
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Body:', text);
}
run()
