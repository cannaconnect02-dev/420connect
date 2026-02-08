-- Migration: Add document_url to profiles table
-- Rerunnable: Yes

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'document_url') THEN
        ALTER TABLE public.profiles ADD COLUMN document_url TEXT;
    END IF;
END $$;
