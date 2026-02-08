
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
}

const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function forceUpdate() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const storeId = 'f6f79879-7fc8-4d53-a56d-11a58efadbaa';

        const query = `
            UPDATE stores
            SET is_verified = true,
                is_open = true,
                latitude = -33.9249,
                longitude = 18.4241,
                location = 'POINT(18.4241 -33.9249)'
            WHERE id = $1
            RETURNING *;
        `;

        const res = await client.query(query, [storeId]);

        if (res.rowCount > 0) {
            console.log('Successfully updated store:', res.rows[0].name);
            console.log('is_open:', res.rows[0].is_open);
            console.log('is_verified:', res.rows[0].is_verified);
        } else {
            console.log('No store found with that ID');
        }

    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

forceUpdate();
