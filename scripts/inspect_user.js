const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const USER_ID = '66d0cbf0-eff4-42d9-86e4-08b633c00929'; // From previous step

if (!DATABASE_URL) {
    console.error('❌ Missing DATABASE_URL environment variable');
    process.exit(1);
}

const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspectUser() {
    try {
        await client.connect();

        const res = await client.query(`
            SELECT id, email, phone FROM auth.users WHERE id = $1
        `, [USER_ID]);

        if (res.rows.length === 0) {
            console.log('No user found.');
        } else {
            console.log('User:', JSON.stringify(res.rows[0], null, 2));
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

inspectUser();
