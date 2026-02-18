
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkUserAddressesDirect() {
    try {
        await client.connect();
        console.log("Connected to database directly.");

        const res = await client.query('SELECT * FROM user_addresses LIMIT 5');
        console.log(`Found ${res.rows.length} addresses in user_addresses table.`);

        if (res.rows.length > 0) {
            console.log("Sample Data:", res.rows);
        } else {
            console.log("Table is empty.");
        }
    } catch (err) {
        console.error("Database connection error:", err);
    } finally {
        await client.end();
    }
}

checkUserAddressesDirect();
