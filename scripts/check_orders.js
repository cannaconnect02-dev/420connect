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

async function checkOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select('id, total_amount, base_amount, markup_amount, delivery_fee, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }

    console.log('--- RECENT ORDERS ---');
    if (data && data.length > 0) {
        data.forEach(order => {
            console.log(`Order ID: ${order.id}`);
            console.log(`Created: ${new Date(order.created_at).toLocaleString()}`);
            console.log(`Total Amount (Customer Pays): ${order.total_amount}`);
            console.log(`  = Base Amount (Revenue): ${order.base_amount}`);
            console.log(`  + Markup Amount: ${order.markup_amount}`);
            console.log(`  + Delivery Fee: ${order.delivery_fee}`);

            const calculatedTotal = Number(order.base_amount || 0) + Number(order.markup_amount || 0) + Number(order.delivery_fee || 0);
            console.log(`Calculated Total: ${calculatedTotal}`);
            console.log(`Matches Total Amount? ${calculatedTotal === Number(order.total_amount) ? 'YES ✅' : 'NO ❌'}`);
            console.log('---------------------');
        });
    } else {
        console.log('No orders found.');
    }
}

checkOrders();
