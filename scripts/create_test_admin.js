const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/merchant-portal/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const connectionString = process.env.DATABASE_URL;

const supabase = createClient(supabaseUrl, supabaseKey);

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function createTestAdmin() {
    const timestamp = Math.floor(Date.now() / 1000);
    const email = `admin.test.${timestamp}@gmail.com`;
    const password = 'Password123!';

    console.log(`Creating Admin User: ${email}`);

    // 1. Sign Up
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: 'Admin Test User',
                role: 'admin' // Some apps use metadata for role, but we rely on user_roles table usually
            }
        }
    });

    if (error) {
        console.error('Error creating user:', error);
        return;
    }

    const userId = data.user.id;
    console.log(`User created with ID: ${userId}`);

    // 2. Assign Admin Role in DB
    try {
        await client.connect();

        // Check if role exists in public.roles if you have such a table, or just user_roles
        // Assuming user_roles(user_id, role)
        await client.query(`
      INSERT INTO user_roles (user_id, role)
      VALUES ($1, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING
    `, [userId]);

        console.log('✅ Added to user_roles as "admin"');
        console.log('------------------------------------------------');
        console.log(`EMAIL: ${email}`);
        console.log(`PASSWORD: ${password}`);
        console.log('------------------------------------------------');

    } catch (err) {
        console.error('Error assigning role:', err);
    } finally {
        await client.end();
    }
}

createTestAdmin();
