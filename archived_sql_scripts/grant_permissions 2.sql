
-- Grant usage on schema (usually implicit but good to be safe)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions for user_roles
GRANT SELECT ON public.user_roles TO authenticated;
-- We don't want users writing to user_roles directly, only reading

-- Grant permissions for role_requests
GRANT SELECT, INSERT ON public.role_requests TO authenticated;

-- Also verify restaurants table permissions (since we modified it)
GRANT SELECT, INSERT, UPDATE ON public.restaurants TO authenticated;
-- Verify stores table permissions if it still exists and is used
GRANT SELECT, INSERT, UPDATE ON public.stores TO authenticated;

-- Grant access to service_role for everything (usually implicit)
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.role_requests TO service_role;
GRANT ALL ON public.restaurants TO service_role;
