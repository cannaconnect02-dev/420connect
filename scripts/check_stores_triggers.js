const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/merchant-portal/.env') });

const connectionString = process.env.DATABASE_URL;

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function checkTriggers() {
    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query(`
      SELECT event_object_table, trigger_name, event_manipulation, action_statement, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'stores'
    `);

        if (res.rows.length === 0) {
            console.log('No triggers found on stores table.');
        } else {
            console.table(res.rows);
        }
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await client.end();
    }
}

checkTriggers();
