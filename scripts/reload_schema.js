const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ Missing DATABASE_URL environment variable');
    process.exit(1);
}

const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function reloadSchema() {
    try {
        await client.connect();
        console.log('✅ Connected to database');

        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log('✅ Sent reload schema notification to PostgREST');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

reloadSchema();
