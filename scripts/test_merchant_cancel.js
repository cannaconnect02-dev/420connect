const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const ORDER_ID = '6040274b-69a3-48f6-a8c2-e59b23b1c85d';

async function testCancel() {
    try {
        await client.connect();
        console.log('Connected to database');

        console.log(`Attempting to cancel order ${ORDER_ID} as 'merchant'...`);

        const res = await client.query(`
            UPDATE orders 
            SET status = 'cancelled', 
                cancelled_by = 'merchant', 
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [ORDER_ID]);

        if (res.rowCount > 0) {
            console.log('✅ Order cancelled successfully in DB!');
            console.log('Resulting Order Status:', res.rows[0].status);
            console.log('Resulting Order Cancelled By:', res.rows[0].cancelled_by);

            // Check ledger entry
            const ledgerRes = await client.query(`
                SELECT * FROM store_ledger WHERE order_id = $1
            `, [ORDER_ID]);
            console.log('Ledger Entries found:', ledgerRes.rows.length);
            if (ledgerRes.rows.length > 0) {
                console.table(ledgerRes.rows);
            }
        } else {
            console.error('❌ Order not found or no rows updated.');
        }

    } catch (err) {
        console.error('❌ Database Error during cancellation:', err.message);
        console.error('Detail:', err.detail);
        console.error('Hint:', err.hint);
    } finally {
        await client.end();
    }
}

testCancel();
