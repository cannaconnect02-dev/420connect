
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspect() {
    console.log("Fetching one restaurant to inspect columns...");
    const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    if (restaurants && restaurants.length > 0) {
        console.log("Columns found:", Object.keys(restaurants[0]));
        console.log("Sample Data:", restaurants[0]);
    } else {
        console.log("No restaurants found.");
    }
}

inspect();
