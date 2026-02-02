
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDrivers() {
    console.log('Checking for driver profiles...');

    // 1. Get all profiles
    const { data, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error('Error querying profiles:', error.message);
    } else {
        console.log('Total profiles found:', data.length);
        const drivers = data.filter(p => p.role === 'driver');
        console.log('Drivers found:', drivers.length);
        console.table(drivers.map(d => ({
            id: d.id,
            email: d.email, // email might not be in profiles table depending on schema
            role: d.role,
            status: d.status,
            created_at: d.created_at
        })));
    }
}

checkDrivers();
