-- Migration: Add Cancellation Reasons Table and update Orders table
-- Rerunnable: Yes (uses IF NOT EXISTS and ON CONFLICT)

BEGIN;

-- 1. Create the cancellation_reasons table
CREATE TABLE IF NOT EXISTS public.cancellation_reasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reason_text TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cancellation_reasons ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated to read reasons
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cancellation_reasons' 
        AND policyname = 'Anyone authenticated can read cancellation reasons'
    ) THEN
        CREATE POLICY "Anyone authenticated can read cancellation reasons" 
        ON public.cancellation_reasons 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END $$;

-- Insert some sensible default reasons
INSERT INTO public.cancellation_reasons (reason_text) VALUES 
('Out of stock items'),
('Store is too busy/closing'),
('Customer requested cancellation'),
('Suspected fraudulent order'),
('Other')
ON CONFLICT (reason_text) DO NOTHING;

-- 2. Add cancellation_reason_id to orders table (nullable)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason_id UUID REFERENCES public.cancellation_reasons(id) ON DELETE SET NULL;

-- 3. Also add a text column for the reason in case the original reason ID is deleted later
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

COMMIT;
