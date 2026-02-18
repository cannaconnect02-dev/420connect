
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from the merchant portal .env (assuming it has the keys)
dotenv.config({ path: path.resolve(__dirname, '../apps/merchant-portal/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStores() {
    console.log('Checking stores...');
    const { data: stores, error } = await supabase
        .from('stores')
        .select('id, name, is_open, is_verified, latitude, longitude, owner_id');

    if (error) {
        console.error('Error fetching stores:', error);
        return;
    }

    console.table(stores);

    if (stores.length === 0) {
        console.log('No stores found.');
    } else {
        console.log(`Found ${stores.length} stores.`);
        stores.forEach(s => {
            if (!s.is_verified) console.log(`WARNING: Store "${s.name}" is NOT VERIFIED.`);
            if (!s.is_open) console.log(`WARNING: Store "${s.name}" is CLOSED.`);
            if (!s.latitude || !s.longitude) console.log(`WARNING: Store "${s.name}" has NO LOCATION.`);
        });
    }
}

checkStores();
