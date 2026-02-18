
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const TEST_USER_ID = 'c4139355-3e3d-4456-8af3-5b91790cb222'; // "New User"

async function insertTestAddress() {
    try {
        await client.connect();

        console.log(`Inserting test address for user ${TEST_USER_ID}...`);

        const insertQuery = `
            INSERT INTO user_addresses (user_id, address_line1, suburb, city, postal_code, lat, lng, is_default)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;

        const values = [
            TEST_USER_ID,
            '123 Test Street',
            'Test Suburb',
            'Cape Town',
            '8000',
            -33.9249,
            18.4241,
            true
        ];

        const res = await client.query(insertQuery, values);

        console.log("Insert successful!");
        console.log("Inserted Record:", res.rows[0]);

    } catch (err) {
        console.error("Database error:", err);
    } finally {
        await client.end();
    }
}

insertTestAddress();
