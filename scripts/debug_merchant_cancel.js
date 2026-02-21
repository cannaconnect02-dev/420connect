const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function debugCancel() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Find a recent non-cancelled order
        const findRes = await client.query(`
            SELECT id, status, store_id, cancelled_by 
            FROM orders 
            WHERE status != 'cancelled' 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (findRes.rows.length === 0) {
            console.log('No eligible orders found to cancel.');
            return;
        }

        const order = findRes.rows[0];
        console.log('Found order to test cancellation:', order);

        console.log('--- Attempting UPDATE (simulating merchant) ---');
        const updateRes = await client.query(`
            UPDATE orders 
            SET status = 'cancelled', 
                cancelled_by = 'merchant', 
                updated_at = NOW() 
            WHERE id = $1
            RETURNING id, status, cancelled_by, updated_at
        `, [order.id]);

        console.log('Update result:', updateRes.rows[0]);

        console.log('--- Verifying state in DB ---');
        const verifyRes = await client.query('SELECT id, status, cancelled_by FROM orders WHERE id = $1', [order.id]);
        console.table(verifyRes.rows);

    } catch (err) {
        console.error('ERROR during debug:', err.message);
        console.error('Full error details:', err);
    } finally {
        await client.end();
    }
}

debugCancel();
