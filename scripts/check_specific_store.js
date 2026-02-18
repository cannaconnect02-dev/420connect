const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/merchant-portal/.env') });

const connectionString = process.env.DATABASE_URL;

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

const userId = '3eaffda9-3251-41af-b15c-98f2f7cbffed';

async function checkUserStore() {
    try {
        await client.connect();
        console.log(`Checking store for user: ${userId}`);

        const res = await client.query(`
      SELECT * FROM stores WHERE owner_id = $1
    `, [userId]);

        if (res.rows.length === 0) {
            console.log('❌ NO STORE FOUND for this user.');
        } else {
            console.log('✅ Store Found:');
            console.table(res.rows);
        }

        // Also check profile
        const profileRes = await client.query(`SELECT * FROM profiles WHERE id = $1`, [userId]);
        console.log('Profile:');
        console.table(profileRes.rows);

        // Check Role Requests
        const roleRes = await client.query(`SELECT * FROM role_requests WHERE user_id = $1`, [userId]);
        console.log('Role Requests:');
        if (roleRes.rows.length === 0) {
            console.log('❌ NO ROLE REQUESTS FOUND.');
        } else {
            console.table(roleRes.rows);
        }

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await client.end();
    }
}

checkUserStore();
