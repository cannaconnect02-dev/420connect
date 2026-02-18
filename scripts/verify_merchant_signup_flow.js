const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/merchant-portal/.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !DATABASE_URL) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const pgClient = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runTest() {
    const timestamp = Date.now();
    const testEmail = `test_merchant_${timestamp}@example.com`;
    const testPassword = 'Password123!';
    const testFirstName = 'TestFirst';
    const testSurname = 'TestSurname';
    const testStoreName = `Test Store ${timestamp}`;
    const testRegNumber = `REG-${timestamp}`;

    console.log(`\n--- Starting Merchant Signup Verification ---`);
    console.log(`Email: ${testEmail}`);
    console.log(`Store: ${testStoreName}`);

    try {
        // 1. Call the Edge Function
        console.log('\nCalling create-merchant edge function...');

        // Note: Edge Functions are usually at /functions/v1/function-name
        // BUT we need to know the actual URL. If running locally it might be localhost:54321
        // If deployed, it's the project URL. Based on VITE_SUPABASE_URL, let's try the project URL first.
        // However, invoking via supabase-js client is easier if functions are deployed.

        const { data: functionData, error: functionError } = await supabase.functions.invoke('create-merchant', {
            body: {
                email: testEmail,
                password: testPassword,
                metadata: {
                    full_name: `${testFirstName} ${testSurname}`,
                    first_name: testFirstName,
                    surname: testSurname,
                    address: '123 Test St, Test City',
                    latitude: null, // Frontend might send null if address selection fails or isn't complete
                    longitude: null,
                    role: 'merchant',
                    store_name: testStoreName,
                    registration_number: testRegNumber,
                    document_url: "", // Frontend sends empty string if no file uploaded
                    // date_of_birth is MISSING as per Auth.tsx analysis
                }
            }
        });

        if (functionError) {
            console.error('Function Error:', functionError);
            throw new Error(`Edge Function Failed: ${functionError.message}`);
        }

        console.log('Function Response:', functionData);

        if (!functionData || !functionData.user) {
            throw new Error('Function did not return user data');
        }

        const userId = functionData.user.id;
        console.log(`User created with ID: ${userId}`);

        // 2. Verify Database
        console.log('\nVerifying Database Records...');
        await pgClient.connect();

        // Check Profile
        const profileRes = await pgClient.query('SELECT * FROM profiles WHERE id = $1', [userId]);
        if (profileRes.rows.length === 0) throw new Error('Profile NOT found!');
        const profile = profileRes.rows[0];
        console.log('Profile found:', {
            first_name: profile.first_name,
            surname: profile.surname,
            store_name: profile.store_name,
            registration_number: profile.registration_number // Should be there from trigger or explicit update
        });

        if (profile.first_name !== testFirstName) console.error('FAIL: First Name mismatch');
        if (profile.registration_number !== testRegNumber) console.error('FAIL: Reg Number mismatch in profile');

        // Check Store
        const storeRes = await pgClient.query('SELECT * FROM stores WHERE owner_id = $1', [userId]);
        if (storeRes.rows.length === 0) throw new Error('Store NOT found!');
        const store = storeRes.rows[0];
        console.log('Store found:', {
            name: store.name,
            registration_number: store.registration_number,
            is_active: store.is_active
        });

        if (store.name !== testStoreName) console.error('FAIL: Store Name mismatch');
        if (store.registration_number !== testRegNumber) console.error('FAIL: Reg Number mismatch in store');

        console.log('\n--- VERIFICATION SUCCESSFUL ---');

    } catch (err) {
        console.error('\n--- TEST FAILED ---');
        console.error(err);
    } finally {
        await pgClient.end();
    }
}

runTest();
