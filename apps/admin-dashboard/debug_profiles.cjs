
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('Checking "profiles" table...');

    // 1. Try simple select
    const { data: rows, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .limit(5);

    if (error) {
        console.error('Error querying profiles:', error.message);
        console.error('Hint:', error.hint);
        console.error('Details:', error.details);
    } else {
        console.log('Success! Profiles table accessible.');
        console.log('Row count:', count);
        console.log('First few rows:', rows);
    }
}

inspectSchema();
