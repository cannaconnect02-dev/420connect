-- Migration: Add preferred_name column to profiles
-- Rerunnable: Yes (uses IF NOT EXISTS and CREATE OR REPLACE)

-- ============================================
-- 1. Add preferred_name column to profiles table
-- ============================================

DO $$
BEGIN
    -- Add preferred_name column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'preferred_name') THEN
        ALTER TABLE public.profiles ADD COLUMN preferred_name TEXT;
    END IF;
END $$;

-- ============================================
-- 2. Update handle_new_user function to include preferred_name
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    u_first_name TEXT;
    u_surname TEXT;
    u_preferred_name TEXT;
    u_full_name TEXT;
BEGIN
    u_first_name := new.raw_user_meta_data->>'first_name';
    u_surname := new.raw_user_meta_data->>'surname';
    u_preferred_name := new.raw_user_meta_data->>'preferred_name';
    
    -- Construct full name if not explicitly provided
    u_full_name := new.raw_user_meta_data->>'full_name';
    IF u_full_name IS NULL AND u_first_name IS NOT NULL THEN
        u_full_name := u_first_name || ' ' || COALESCE(u_surname, '');
    END IF;

    INSERT INTO public.profiles (
        id, 
        role, 
        full_name, 
        first_name, 
        surname,
        preferred_name,
        dob, 
        avatar_url
    )
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'role', 'customer'), 
        TRIM(u_full_name),
        u_first_name,
        u_surname,
        COALESCE(u_preferred_name, u_first_name),
        (new.raw_user_meta_data->>'dob')::DATE,
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
