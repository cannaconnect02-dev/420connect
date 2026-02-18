-- RLS on spatial_ref_sys skipped due to permission restrictions
-- ALTER TABLE extensions.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
-- DO $$ 
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM pg_policy 
--         WHERE polname = 'Allow public read access' 
--         AND polrelid = 'extensions.spatial_ref_sys'::regclass
--     ) THEN
--         CREATE POLICY "Allow public read access" ON extensions.spatial_ref_sys FOR SELECT USING (true);
--     END IF;
-- END $$;

GRANT SELECT ON extensions.spatial_ref_sys TO anon, authenticated, service_role;

-- Fix 2: Change views to functionality as SECURITY INVOKER
-- This ensures they respect RLS policies of the underlying tables (orders, restaurants, profiles)
ALTER VIEW public.driver_orders_view SET (security_invoker = true);
ALTER VIEW public.merchant_orders_view SET (security_invoker = true);
