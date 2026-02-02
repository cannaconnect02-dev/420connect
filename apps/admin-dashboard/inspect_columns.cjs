
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectColumns() {
    console.log('Inspecting profile columns via dummy insert error...');

    // Attempting to insert dummy data to trigger an error that might reveal columns,
    // or just selecting a non-existent column to see the error.

    const { data, error } = await supabase
        .from('profiles')
        .select('status')
        .limit(1);

    if (error) {
        console.log('Error selecting status:', error.message);
    } else {
        console.log('Success! "status" column exists.');
        console.log('Data:', data);
    }
}

inspectColumns();
