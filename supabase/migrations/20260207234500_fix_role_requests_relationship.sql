-- Create a Foreign Key relationship between role_requests and profiles
-- This is necessary for Supabase to perform the join in the API query

DO $$
BEGIN
    -- Only add If it doesn't already exist to avoid errors
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'role_requests_profiles_id_fkey'
    ) THEN
        ALTER TABLE public.role_requests
        ADD CONSTRAINT role_requests_profiles_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id);
    END IF;
END $$;
