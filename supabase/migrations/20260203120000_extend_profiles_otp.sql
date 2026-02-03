-- Migration: Extend profiles table and create OTP system
-- Rerunnable: Yes (uses IF NOT EXISTS and DO blocks)

-- ============================================
-- 1. Extend profiles table with new columns
-- ============================================

DO $$
BEGIN
    -- Add first_name column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'first_name') THEN
        ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
    END IF;

    -- Add surname column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'surname') THEN
        ALTER TABLE public.profiles ADD COLUMN surname TEXT;
    END IF;

    -- Add dob (date of birth) column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'dob') THEN
        ALTER TABLE public.profiles ADD COLUMN dob DATE;
    END IF;

    -- Add email_verified column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'email_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

