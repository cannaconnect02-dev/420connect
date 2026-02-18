const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/admin-dashboard/.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyAdminVisibility() {
    console.log('--- Simulating Admin Portal "Store Approvals" Query ---');

    try {
        // This matches the query in apps/admin-dashboard/src/pages/StoreApprovals.tsx
        const { data, error } = await supabase
            .from('role_requests')
            .select(`
            id,
            user_id,
            role,
            status,
            requested_at,
            profiles:user_id (
                full_name,
                stores (
                    name,
                    registration_number,
                    document_url,
                    is_verified
                )
            )
        `)
            .eq('status', 'pending')
            .order('requested_at', { ascending: false })
            .limit(5);

        if (error) {
            throw new Error(`Query Failed: ${error.message}`);
        }

        console.log(`Found ${data.length} pending requests.`);

        if (data.length > 0) {
            console.log('\n--- Most Recent Requests ---');
            data.forEach((req, index) => {
                const profile = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles;
                // Now stores is nested in profile
                const stores = profile?.stores;
                const store = Array.isArray(stores) ? stores[0] : stores;

                console.log(`\n[${index + 1}] Request ID: ${req.id}`);
                console.log(`    User ID: ${req.user_id}`);
                console.log(`    Requested At: ${req.requested_at}`);
                console.log(`    Profile Name: ${profile?.full_name || 'N/A'}`);

                if (store) {
                    console.log(`    Store Name: ${store.name}`);
                    console.log(`    Reg Number: ${store.registration_number}`);
                    console.log(`    Doc URL: ${store.document_url ? 'Present' : 'Missing'}`);
                    console.log(`    Is Verified: ${store.is_verified}`);
                } else {
                    console.log(`    Store: NOT FOUND / NOT LINKED`);
                }
            });
        }

    } catch (err) {
        console.error('Verification Failed:', err);
    }
}

verifyAdminVisibility();
