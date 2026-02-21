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

        console.log('--- Latest Store Ledger Entries ---');
        const ledger = await client.query(`
            SELECT * FROM store_ledger ORDER BY created_at DESC LIMIT 10
        `);
        console.table(ledger.rows);

        console.log('\n--- Store Balances ---');
        const stores = await client.query(`
            SELECT id, name, ledger_balance FROM stores
        `);
        console.table(stores.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
