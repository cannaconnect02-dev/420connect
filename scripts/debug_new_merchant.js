const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/merchant-portal/.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function checkRecentData() {
    try {
        await client.connect();
        console.log('Connected to database');

        console.log('\n--- Recent Profiles ---');
        const profiles = await client.query('SELECT id, role, first_name, surname, store_name, created_at FROM profiles ORDER BY created_at DESC LIMIT 3');
        console.table(profiles.rows);

        console.log('\n--- Recent Stores ---');
        const stores = await client.query('SELECT id, owner_id, name, is_verified, created_at FROM stores ORDER BY created_at DESC LIMIT 3');
        console.table(stores.rows);

        console.log('\n--- Recent Role Requests ---');
        const roleRequests = await client.query('SELECT id, user_id, role, status, requested_at FROM role_requests ORDER BY requested_at DESC LIMIT 3');
        console.table(roleRequests.rows);

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await client.end();
    }
}

checkRecentData();
