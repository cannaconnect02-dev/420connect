-- Migration: Add VAT Setting, Statements Bucket, and Weekly Statements Table
-- Rerunnable: Yes

BEGIN;

-- 1. Insert Global VAT Setting into the settings table
INSERT INTO public.settings (key, value)
VALUES ('global_vat_percent', '{"percent": 15}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Create the Statements Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('statements', 'statements', true)
ON CONFLICT (id) DO NOTHING;

-- Insert Storage Policy if it doesn't already exist (Public read access)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname = 'Public Access to Statements'
    ) THEN
        CREATE POLICY "Public Access to Statements" 
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'statements');
    END IF;
END $$;

-- 3. Create Weekly Statements Tracker Table
CREATE TABLE IF NOT EXISTS public.weekly_statements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    storage_path TEXT NOT NULL,
    gross_revenue NUMERIC NOT NULL,
    net_payout NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.weekly_statements ENABLE ROW LEVEL SECURITY;

-- Stores can read their own statements
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'weekly_statements' 
        AND policyname = 'Stores can view their own statements'
    ) THEN
        CREATE POLICY "Stores can view their own statements" 
        ON public.weekly_statements 
        FOR SELECT 
        TO authenticated 
        USING (auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'store_owner' AND store_id = weekly_statements.store_id
        ));
    END IF;
END $$;

-- Admins can view all statements
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'weekly_statements' 
        AND policyname = 'Admins can manage all statements'
    ) THEN
        CREATE POLICY "Admins can manage all statements" 
        ON public.weekly_statements 
        FOR ALL 
        TO authenticated 
        USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;

COMMIT;
