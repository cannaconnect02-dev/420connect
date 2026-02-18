-- Migration: Add address_confirmed to profiles table
-- Rerunnable: Yes

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'address_confirmed') THEN
        ALTER TABLE public.profiles ADD COLUMN address_confirmed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
