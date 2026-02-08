
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../apps/merchant-portal/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyStore() {
    const storeId = 'f6f79879-7fc8-4d53-a56d-11a58efadbaa';
    console.log(`Updating store ${storeId}...`);

    const { data, error } = await supabase
        .from('stores')
        .update({
            is_verified: true,
            is_open: true,
            latitude: -33.9249,
            longitude: 18.4241,
            location: 'POINT(18.4241 -33.9249)'
        })
        .eq('id', storeId)
        .select();

    if (error) {
        console.error('Error updating store:', error);
    } else {
        console.log('Store updated successfully:', data);
    }
}

verifyStore();
