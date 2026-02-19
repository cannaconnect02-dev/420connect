
-- Add missing columns to restaurants table to support Merchant Portal Settings
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "21:00"},
    "tuesday": {"open": "09:00", "close": "21:00"},
    "wednesday": {"open": "09:00", "close": "21:00"},
    "thursday": {"open": "09:00", "close": "21:00"},
    "friday": {"open": "09:00", "close": "21:00"},
    "saturday": {"open": "10:00", "close": "22:00"},
    "sunday": {"open": "10:00", "close": "20:00"}
}'::jsonb,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Allow Merchants to update their own restaurant details
-- (Assuming existing RLS might block UPDATE if not explicit)
CREATE POLICY "Merchants can update their own restaurant" 
ON public.restaurants FOR UPDATE
TO authenticated 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());
