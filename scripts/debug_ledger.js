const { Client } = require('pg');
require('dotenv').config();

async function debug() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('--- Connected to DB directly ---');

        console.log('\n--- Inspecting Recent Orders (Any Status) ---');
        const ordersRes = await client.query('SELECT id, status, cancelled_by, store_id, created_at FROM public.orders ORDER BY created_at DESC LIMIT 5');
        console.table(ordersRes.rows);

        console.log('\n--- Inspecting Recently Cancelled Orders ---');
        const cancelledRes = await client.query("SELECT id, status, cancelled_by, store_id, created_at FROM public.orders WHERE status = 'cancelled' ORDER BY created_at DESC LIMIT 5");
        console.table(cancelledRes.rows);

        console.log('\n--- Inspecting Store Ledger ---');
        const ledgerRes = await client.query('SELECT * FROM public.store_ledger ORDER BY created_at DESC LIMIT 10');
        console.table(ledgerRes.rows);

        console.log('\n--- Inspecting Settings ---');
        const settingsRes = await client.query("SELECT * FROM public.settings WHERE key = 'cancellation_fee'");
        console.table(settingsRes.rows);

        console.log('\n--- Checking Triggers on public.orders ---');
        const triggerRes = await client.query(`
            SELECT trigger_name, event_manipulation, action_statement, action_condition
            FROM information_schema.triggers
            WHERE event_object_table = 'orders'
        `);
        console.table(triggerRes.rows);

    } catch (err) {
        console.error('Debug Error:', err);
    } finally {
        await client.end();
    }
}

debug();
