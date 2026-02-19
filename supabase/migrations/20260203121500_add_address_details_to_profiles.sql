-- Migration: Add address and delivery coordinates to profiles table
-- Rerunnable: Yes

DO $$
BEGIN
    -- Add address column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'address') THEN
        ALTER TABLE public.profiles ADD COLUMN address TEXT;
    END IF;

    -- Add delivery_lat column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'delivery_lat') THEN
        ALTER TABLE public.profiles ADD COLUMN delivery_lat DOUBLE PRECISION;
    END IF;

    -- Add delivery_lng column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'delivery_lng') THEN
        ALTER TABLE public.profiles ADD COLUMN delivery_lng DOUBLE PRECISION;
    END IF;
END $$;
