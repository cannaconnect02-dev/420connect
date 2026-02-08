-- Migration: Add store_name and address to profiles table
-- Rerunnable: Yes

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'store_name') THEN
        ALTER TABLE public.profiles ADD COLUMN store_name TEXT;
    END IF;



    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'registration_number') THEN
        ALTER TABLE public.profiles ADD COLUMN registration_number TEXT;
    END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'date_of_birth') THEN
        ALTER TABLE public.profiles ADD COLUMN date_of_birth DATE;
    END IF;
END $$;
