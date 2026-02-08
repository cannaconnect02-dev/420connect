const { Client } = require('pg');
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

async function verifySchema() {
    try {
        await client.connect();

        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'document_url';
    `);

        if (res.rows.length > 0) {
            console.log('Verification PASSED: document_url column exists in profiles table.');
        } else {
            console.error('Verification FAILED: document_url column MISSING in profiles table.');
        }

    } catch (err) {
        console.error('Error verifying schema:', err);
    } finally {
        await client.end();
    }
}

verifySchema();
