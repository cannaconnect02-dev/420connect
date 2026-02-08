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

async function updatePolicy() {
    try {
        await client.connect();
        console.log('Connected to database');

        // Drop existing policy if exists (to avoid conflicts or confusion)
        await client.query(`
      DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
    `);
        console.log('Dropped "Allow authenticated uploads" policy.');

        // Create public upload policy
        await client.query(`
      DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
      
      CREATE POLICY "Allow public uploads"
      ON storage.objects
      FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'merchant-documents');
    `);
        console.log('Created "Allow public uploads" policy.');

        // Ensure public read access is also there (it was in previous script, but good to ensure)
        await client.query(`
      DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

      CREATE POLICY "Allow public read"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'merchant-documents');
    `);
        console.log('Ensured "Allow public read" policy.');

    } catch (err) {
        console.error('Error updating policies:', err);
    } finally {
        await client.end();
    }
}

updatePolicy();
