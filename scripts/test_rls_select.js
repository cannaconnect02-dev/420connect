const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        const ownerId = '7e1340f5-93bc-4d3a-93f4-76308c871bb2'; // Herbs3's Store owner
        const storeId = 'f6f79879-7fc8-4d53-a56d-11a58efadbaa'; // Herbs3's Store ID

        await client.query('BEGIN');
        await client.query("SELECT set_config('role', 'authenticated', true)");
        await client.query(`SELECT set_config('request.jwt.claims', '{"sub":"' || $1 || '", "role":"authenticated"}', true)`, [ownerId]);

        const res = await client.query("SELECT id, status FROM orders WHERE store_id = $1 AND status != 'cancelled'", [storeId]);
        console.log('Orders visible to merchant directly in DB:', res.rows.length);
        console.log(res.rows);

        await client.query('ROLLBACK');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

run();
