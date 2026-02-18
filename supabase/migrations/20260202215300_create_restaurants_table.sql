-- Migration: Create restaurants table
-- Rerunnable: Yes (uses IF NOT EXISTS and idempotent operations)

CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    location GEOGRAPHY(POINT) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_open BOOLEAN DEFAULT TRUE,
    phone TEXT,
    email TEXT,
    operating_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "21:00"},
        "tuesday": {"open": "09:00", "close": "21:00"},
        "wednesday": {"open": "09:00", "close": "21:00"},
        "thursday": {"open": "09:00", "close": "21:00"},
        "friday": {"open": "09:00", "close": "21:00"},
        "saturday": {"open": "10:00", "close": "22:00"},
        "sunday": {"open": "10:00", "close": "20:00"}
    }'::jsonb,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist (for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'is_open') THEN
        ALTER TABLE public.restaurants ADD COLUMN is_open BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'phone') THEN
        ALTER TABLE public.restaurants ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'email') THEN
        ALTER TABLE public.restaurants ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'operating_hours') THEN
        ALTER TABLE public.restaurants ADD COLUMN operating_hours JSONB DEFAULT '{
            "monday": {"open": "09:00", "close": "21:00"},
            "tuesday": {"open": "09:00", "close": "21:00"},
            "wednesday": {"open": "09:00", "close": "21:00"},
            "thursday": {"open": "09:00", "close": "21:00"},
            "friday": {"open": "09:00", "close": "21:00"},
            "saturday": {"open": "10:00", "close": "22:00"},
            "sunday": {"open": "10:00", "close": "20:00"}
        }'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'latitude') THEN
        ALTER TABLE public.restaurants ADD COLUMN latitude DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'longitude') THEN
        ALTER TABLE public.restaurants ADD COLUMN longitude DOUBLE PRECISION;
    END IF;
END $$;

-- Create index for geospatial queries (idempotent)
CREATE INDEX IF NOT EXISTS restaurants_location_idx ON public.restaurants USING GIST (location);

-- Enable RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop first to make rerunnable)
DROP POLICY IF EXISTS "Public Access" ON public.restaurants;
CREATE POLICY "Public Access" ON public.restaurants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Merchants can update their own restaurant" ON public.restaurants;
CREATE POLICY "Merchants can update their own restaurant" ON public.restaurants 
    FOR UPDATE TO authenticated 
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Merchants can insert restaurants" ON public.restaurants;
CREATE POLICY "Merchants can insert restaurants" ON public.restaurants 
    FOR INSERT TO authenticated 
    WITH CHECK (owner_id = auth.uid());
