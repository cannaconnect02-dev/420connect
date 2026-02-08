
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkProfilesDirect() {
    try {
        await client.connect();

        const res = await client.query('SELECT id, full_name, created_at, role FROM profiles ORDER BY created_at DESC LIMIT 5');

        if (res.rows.length > 0) {
            console.log("Profiles:", res.rows);
        } else {
            console.log("Profiles table is empty.");
        }
    } catch (err) {
        console.error("Database connection error:", err);
    } finally {
        await client.end();
    }
}

checkProfilesDirect();
