-- Migration: Security fixes and PostGIS spatial reference
-- Rerunnable: Yes (uses IF NOT EXISTS for policies and GRANT is idempotent)

-- Fix 1: Enable RLS on spatial_ref_sys and allow public read access (required for PostGIS operations)
-- Note: This table may not exist in all environments, so we wrap in exception handling
DO $$ 
BEGIN
    -- Check if table exists before trying to modify it
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'spatial_ref_sys') THEN
        ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_policy 
            WHERE polname = 'Allow public read access' 
            AND polrelid = 'public.spatial_ref_sys'::regclass
        ) THEN
            CREATE POLICY "Allow public read access" ON public.spatial_ref_sys FOR SELECT USING (true);
        END IF;
        
        GRANT SELECT ON public.spatial_ref_sys TO anon, authenticated, service_role;
    END IF;
END $$;
