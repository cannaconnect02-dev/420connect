-- Allow admins to view all role_requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'role_requests' 
        AND policyname = 'Admins can view all role requests'
    ) THEN
        CREATE POLICY "Admins can view all role requests" ON public.role_requests
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid()
                AND role = 'admin'
            )
        );
    END IF;

    -- Also ensure admins can view all profiles (if RLS exists on profiles)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Admins can view all profiles'
    ) THEN
        CREATE POLICY "Admins can view all profiles" ON public.profiles
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid()
                AND role = 'admin'
            )
        );
    END IF;
END $$;
