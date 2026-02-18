const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/merchant-portal/.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function checkPolicies() {
    try {
        await client.connect();
        console.log('Connected to database');

        const tables = ['profiles', 'stores', 'role_requests'];

        for (const table of tables) {
            console.log(`\n--- RLS Policies for ${table} ---`);
            const res = await client.query(`
            SELECT policyname, cmd, roles, qual, with_check 
            FROM pg_policies 
            WHERE tablename = $1
        `, [table]);

            if (res.rows.length === 0) {
                console.log('No policies found (or RLS disabled?)');
                // Check if RLS is enabled
                const rls = await client.query(`
                SELECT relname, relrowsecurity 
                FROM pg_class 
                WHERE relname = $1
            `, [table]);
                console.log('RLS Enabled:', rls.rows[0]?.relrowsecurity);
            } else {
                console.table(res.rows);
            }
        }

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await client.end();
    }
}

checkPolicies();
