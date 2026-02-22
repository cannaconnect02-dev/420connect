require('dotenv').config({ path: 'apps/customer-app/.env' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
// using the regular anon key but testing stores
const supabase = createClient(supabaseUrl, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)

async function run() {
    console.log("Checking stores available...")
    const { data, error } = await supabase.from('stores').select('name, address, paystack_split_percentage').limit(3)
    console.log('Stores:', data)
    console.log('Error:', error)
}
run()
