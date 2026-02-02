
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fekngijfsctclvsezgaq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZla25naWpmc2N0Y2x2c2V6Z2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTMxNTQsImV4cCI6MjA4NDI2OTE1NH0.0tXGQox5T3IgTgL-H4jIEhNBZjV8rz-RYUWzpEbnj8M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDemoUser() {
    const email = 'customer@demo.com';
    const password = 'password123';

    console.log(`Creating user ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: 'customer',
                full_name: 'Demo Customer'
            }
        }
    });

    if (error) {
        console.error('Error creating user:', error.message);
    } else {
        console.log('User created (or already exists):', data.user?.id);
    }
}

createDemoUser();
