const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/merchant-portal/.env') });

const connectionString = process.env.DATABASE_URL;

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function checkAdmins() {
    try {
        await client.connect();
        console.log('--- Checking for Admin Users ---');

        const res = await client.query(`
      SELECT ur.user_id, ur.role, p.email, p.full_name
      FROM user_roles ur
      LEFT JOIN profiles p ON ur.user_id = p.id
      WHERE ur.role = 'admin'
    `);

        if (res.rows.length === 0) {
            console.log('❌ NO ADMIN USERS FOUND.');
        } else {
            console.table(res.rows);
        }

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await client.end();
    }
}

checkAdmins();
