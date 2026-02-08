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

async function checkStoresSchema() {
    try {
        await client.connect();
        console.log('Connected to database');

        const schema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'stores'
    `);
        console.table(schema.rows);

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await client.end();
    }
}

checkStoresSchema();
