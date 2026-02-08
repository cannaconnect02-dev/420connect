const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../apps/merchant-portal/.env') });

// Connection string from .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase in some environments
});

async function applyMigration() {
    try {
        await client.connect();
        console.log('Connected to database');

        const migrationFile = path.join(__dirname, '../supabase/migrations/20260208143500_add_document_url_to_profiles.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('Executing SQL...');
        await client.query(sql);
        console.log('Migration applied successfully!');

    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        await client.end();
    }
}

applyMigration();
