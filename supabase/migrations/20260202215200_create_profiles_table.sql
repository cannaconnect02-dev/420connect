-- Migration: Create profiles table (extends Supabase Auth)
-- Rerunnable: Yes (uses IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role TEXT CHECK (role IN ('customer', 'merchant', 'driver', 'admin')) NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    current_location GEOGRAPHY(POINT), -- For drivers/customers
    vehicle_details JSONB, -- For drivers: { registration_number: string, ... }
    rejection_reason TEXT, -- For drivers: reason if status is 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for geospatial queries (idempotent)
CREATE INDEX IF NOT EXISTS profiles_location_idx ON public.profiles USING GIST (current_location);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop first to make rerunnable)
DROP POLICY IF EXISTS "Public Read Access" ON public.profiles;
CREATE POLICY "Public Read Access" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Self Update Access" ON public.profiles;
CREATE POLICY "Self Update Access" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Insert Access" ON public.profiles;
CREATE POLICY "Insert Access" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
