const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testRLS() {
    try {
        await client.connect();
        const orderRes = await client.query(`
            SELECT id, store_id, (SELECT owner_id FROM stores WHERE id = o.store_id) as owner_id 
            FROM orders o 
            WHERE status != 'cancelled' 
            LIMIT 1
        `);

        if (orderRes.rows.length === 0) {
            console.log('No eligible order found.');
            return;
        }

        const order = orderRes.rows[0];
        console.log('Testing with Order:', order);

        await client.query('BEGIN');
        await client.query("SELECT set_config('role', 'authenticated', true)");
        await client.query("SELECT set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)", [order.owner_id]);

        console.log('User Impersonated. Running UPDATE...');
        const updateRes = await client.query(`
            UPDATE orders 
            SET status = 'cancelled', cancelled_by = 'merchant' 
            WHERE id = $1 
            RETURNING id, status, cancelled_by
        `, [order.id]);

        console.log('Update result (ROWS AFFECTED):', updateRes.rowCount);
        if (updateRes.rows.length > 0) {
            console.log('Updated order:', updateRes.rows[0]);
        }

        await client.query('ROLLBACK');
    } catch (err) {
        console.error('Trigger or RLS Error:', err.message);
    } finally {
        await client.end();
    }
}

testRLS();
