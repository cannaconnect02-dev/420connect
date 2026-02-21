const { Client } = require('pg');
require('dotenv').config();

async function testUpdate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        const orderId = '9638d388-e6ae-48ea-95d8-a80e125e701a'; // One of the cancelled ones

        console.log(`Manually setting cancelled_by = 'merchant' for order ${orderId}`);
        const res = await client.query("UPDATE public.orders SET cancelled_by = 'merchant' WHERE id = $1 RETURNING *", [orderId]);

        console.log('Update result:');
        console.table(res.rows);

        console.log('\nChecking ledger...');
        const ledgerRes = await client.query('SELECT * FROM public.store_ledger WHERE order_id = $1', [orderId]);
        console.table(ledgerRes.rows);

    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        await client.end();
    }
}

testUpdate();
