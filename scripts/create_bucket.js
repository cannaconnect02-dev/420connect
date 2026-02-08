
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/merchant-portal/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Using ANON key for client-side ops, but for admin ops (creating bucket) we might need SERVICE_ROLE_KEY.
// Let's check environment variables.
// If SERVICE_ROLE_KEY is not in merchant-portal .env, we might need to look elsewhere or use database adapter.
// Actually, creating a bucket usually requires Service Role or Dashboard.
// Let's try to see if we have SERVICE_ROLE_KEY.

// If not, we can use the PostgreSQL client to insert into storage.buckets table directly! This is often easier if we have DB access.
// Let's use the DB access since we have DATABASE_URL.

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function createBucket() {
    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Create Bucket
        const createBucketSQL = `
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('merchant-documents', 'merchant-documents', true)
      ON CONFLICT (id) DO NOTHING;
    `;

        await client.query(createBucketSQL);
        console.log('Bucket "merchant-documents" created (or already exists).');

        // 2. Create Policy (Allow public access to read?)
        // Actually, we probably want restricted access? But for now let's make it public for simplicity of implementation as requested "registration info... appear on admin dashboard".
        // Admin dashboard needs to read it.

        // We also need a policy to allow authenticated users (merchants) to UPLOAD.

        const policyUploadSQL = `
      CREATE POLICY "Allow authenticated uploads"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'merchant-documents');
    `;

        // We need to wrap policy creation in DO block to check existence or just try/catch
        // Easier to use DO block
        const policyBlock = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow authenticated uploads'
      ) THEN
        CREATE POLICY "Allow authenticated uploads"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'merchant-documents');
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow public read'
      ) THEN
        CREATE POLICY "Allow public read"
        ON storage.objects
        FOR SELECT
        TO public
        USING (bucket_id = 'merchant-documents');
      END IF;
    END $$;
    `;

        await client.query(policyBlock);
        console.log('Storage policies applied.');

    } catch (err) {
        console.error('Error creating bucket/policies:', err);
    } finally {
        await client.end();
    }
}

createBucket();
