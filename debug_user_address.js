
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserAddresses() {
    console.log("Checking user_addresses table...");

    // Fetch all addresses (RLS might restrict this if we are not authenticated as a specific user, 
    // but anon key usually sees nothing if RLS is on for select 'using auth.uid()')
    // WAITING: RLS is enabled: "Users can view their own addresses".
    // So using ANON key without logging in will return EMPTY array.

    // strategy: I cannot easily "login" as a user without their password. 
    // BUT I can check if I can use the SERVICE_ROLE key if available in .env?
    // Let's check if there is a SERVICE_ROLE key in a .env file.

    // If not, I will ask the user to verify via their dashboard, but I can try to see if there is a known test user credentials I can use.
    // user_addresses RLS: USING (auth.uid() = user_id);

    // I entered a "check_stores" script earlier that worked. 
    // The 'stores' table typically has "public read" policy.

    console.log("Attempting to fetch addresses with ANON key (likely will be empty due to RLS)...");
    const { data, error } = await supabase
        .from('user_addresses')
        .select('*');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${data.length} addresses.`);
        console.log(data);
    }
}

checkUserAddresses();
