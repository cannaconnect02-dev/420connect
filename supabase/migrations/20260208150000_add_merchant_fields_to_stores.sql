-- Migration: Add merchant fields to stores and update trigger
-- Rerunnable: Yes

-- 1. Add columns to stores table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'stores' 
                   AND column_name = 'registration_number') THEN
        ALTER TABLE public.stores ADD COLUMN registration_number TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'stores' 
                   AND column_name = 'document_url') THEN
        ALTER TABLE public.stores ADD COLUMN document_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'stores' 
                   AND column_name = 'is_verified') THEN
        ALTER TABLE public.stores ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Update existing stores to have is_verified = false (if null)
UPDATE public.stores SET is_verified = FALSE WHERE is_verified IS NULL;

-- 3. Update handle_new_user trigger to ensuring profiles are created correctly
-- We need to make sure it handles store_name if it's passed in metadata,
-- although store_name might be in profiles or stores. 
-- Previous migrations added store_name to profiles. Let's keep it there for now or just focus on the trigger basics.
-- The issue reported was "not seeing them in the profile table".
-- This might be because of an error in the trigger execution.
-- Let's make the trigger robust.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    first_name,
    surname,
    preferred_name,
    date_of_birth,
    email_verified,
    phone_verified,
    address_confirmed,
    store_name -- Ensure this is mapped if it exists in profiles table
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'surname',
    new.raw_user_meta_data->>'preferred_name',
    CASE 
        WHEN new.raw_user_meta_data->>'dob' = '' THEN NULL 
        ELSE (new.raw_user_meta_data->>'dob')::DATE 
    END, -- Handle empty string for date
    COALESCE((new.raw_user_meta_data->>'email_verified')::BOOLEAN, false),
    COALESCE((new.raw_user_meta_data->>'phone_verified')::BOOLEAN, false),
    false,
    new.raw_user_meta_data->>'store_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    surname = EXCLUDED.surname,
    preferred_name = EXCLUDED.preferred_name,
    date_of_birth = EXCLUDED.date_of_birth,
    store_name = EXCLUDED.store_name;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
