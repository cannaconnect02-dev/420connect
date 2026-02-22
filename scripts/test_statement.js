require('dotenv').config({ path: 'apps/merchant-portal/.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log("Invoking edge function...")
    const { data, error } = await supabase.functions.invoke('generate-statement', {
        body: { store_id: 'dummy', week_start_date: '2024-01-01', week_end_date: '2024-01-07' }
    })
    console.log('Data:', data)
    console.log('Error:', error)
}
run()
