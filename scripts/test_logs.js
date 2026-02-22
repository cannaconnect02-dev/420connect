require('dotenv').config({ path: 'apps/customer-app/.env' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabase = createClient(supabaseUrl, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)

async function run() {
  const { data, error } = await supabase.from('debug_logs').select('*').order('created_at', { ascending: false }).limit(5)
  console.log('Logs:', data)
}
run()
