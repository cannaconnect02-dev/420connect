#!/usr/bin/env node
/**
 * Database Migration Script
 * 
 * Deploys SQL migrations to Supabase using direct PostgreSQL connection.
 * Tracks applied migrations in a '_migrations' table to prevent re-running them.
 * 
 * Usage: npm run db:migrate
 * 
 * Prerequisites:
 * - .env file in project root with DATABASE_URL
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('\n❌ Missing DATABASE_URL environment variable!\n');
    console.error('Please update your .env file with:');
    console.error('  - DATABASE_URL: postgres://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres\n');
    process.exit(1);
}

const PROJECT_ROOT = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'supabase', 'migrations');

// Get migration files
function getMigrationFiles() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
        process.exit(1);
    }

    return fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort(); // Sorts by filename (e.g., timestamp)
}

async function migrate() {
    console.log('\n🚀 Database Migration Runner\n');

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Supabase connection
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Create migrations table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Get applied migrations
        const { rows: appliedRows } = await client.query('SELECT name FROM _migrations');
        const appliedMigrations = new Set(appliedRows.map(r => r.name));

        const migrationFiles = getMigrationFiles();
        const pendingMigrations = migrationFiles.filter(f => !appliedMigrations.has(f));

        if (pendingMigrations.length === 0) {
            console.log('\n✨ Database is up to date! No new migrations found.');
            return;
        }

        console.log(`\n📦 Found ${pendingMigrations.length} pending migrations:`);
        pendingMigrations.forEach(m => console.log(`   - ${m}`));
        console.log('\nApplying migrations...');

        // Apply migrations
        for (const migrationFile of pendingMigrations) {
            const filePath = path.join(MIGRATIONS_DIR, migrationFile);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`\n▶️  Applying ${migrationFile}...`);

            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('INSERT INTO _migrations (name) VALUES ($1)', [migrationFile]);
                await client.query('COMMIT');
                console.log(`✅ Success: ${migrationFile}`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`\n❌ Failed to apply ${migrationFile}:`);
                console.error(err.message);
                process.exit(1);
            }
        }

        console.log('\n🎉 All migrations applied successfully!');

    } catch (err) {
        console.error('\n❌ Database connection error:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate().catch(console.error);
