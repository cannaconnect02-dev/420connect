const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const newReasons = [
    'Out of stock items',
    'Store is too busy/closing',
    'Customer requested cancellation',
    'Suspected fraudulent order',
    'Delivery partner unavailable',
    'Issue with item quality/preparation',
    'Menu item no longer available',
    'Incorrect pricing on item',
    'Equipment failure in kitchen',
    'Cannot fulfil special instructions',
    'Other'
];

async function insertReasons() {
    try {
        await client.connect();

        for (const reason of newReasons) {
            await client.query(`
                INSERT INTO public.cancellation_reasons (reason_text) 
                VALUES ($1) 
                ON CONFLICT (reason_text) DO NOTHING;
            `, [reason]);
            console.log(`Inserted (or already exists): "${reason}"`);
        }

        console.log("Finished inserting new cancellation reasons.");

    } catch (err) {
        console.error("Error inserting reasons:", err);
    } finally {
        await client.end();
    }
}

insertReasons();
