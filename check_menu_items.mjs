import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMenuItems() {
    const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching menu_items:', error);
        return;
    }

    console.log('--- ONE MENU ITEM ---');
    if (data && data.length > 0) {
        console.log(data[0]);
    } else {
        console.log('No menu items found.');
    }
}

checkMenuItems();
