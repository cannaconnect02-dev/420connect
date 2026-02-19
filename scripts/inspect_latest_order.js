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

async function inspectLatestOrder() {
    try {
        await client.connect();

        const res = await client.query(`
            SELECT 
                id, 
                created_at, 
                status, 
                total_amount, 
                paystack_reference, 
                paystack_payment_status,
                payment_method_id
            FROM orders 
            WHERE paystack_payment_status = 'charged'
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (res.rows.length === 0) {
            console.log('No orders found.');
        } else {
            console.log('Latest Order:', JSON.stringify(res.rows[0], null, 2));
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

inspectLatestOrder();
