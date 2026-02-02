
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectOrders() {
    console.log("Inspecting orders table...");

    // Try to fetch one order to see columns
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching orders:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Order Columns:", Object.keys(data[0]));
        console.log("Sample Order:", data[0]);
    } else {
        console.log("No orders found, cannot infer columns from data.");
        // Try to insert a dummy to get a specific column error if needed, or rely on schema docs if available.
        // Or check RLS? 
    }
}

inspectOrders();
