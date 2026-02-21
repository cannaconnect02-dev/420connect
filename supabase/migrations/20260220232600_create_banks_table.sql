-- Migration: Create Banks Reference Table and Link to Bank Details

-- 1. Create Banks reference table
CREATE TABLE IF NOT EXISTS public.banks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    country TEXT NOT NULL DEFAULT 'South Africa',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (readable by all authenticated users)
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Banks are viewable by all authenticated users"
    ON public.banks FOR SELECT
    USING (auth.role() = 'authenticated');

-- 2. Seed with South African banks from Paystack API
INSERT INTO public.banks (name, code, country) VALUES
    ('Absa Bank Limited, South Africa', '632005', 'South Africa'),
    ('Access Bank South Africa', '410506', 'South Africa'),
    ('African Bank Limited', '430000', 'South Africa'),
    ('African Business Bank', '584000', 'South Africa'),
    ('Albaraka Bank', '800000', 'South Africa'),
    ('Bank of China', '686000', 'South Africa'),
    ('Bank Zero', '888000', 'South Africa'),
    ('Bidvest Bank Limited', '462005', 'South Africa'),
    ('Capitec Bank Limited', '470010', 'South Africa'),
    ('Capitec Business', '450105', 'South Africa'),
    ('CitiBank', '350005', 'South Africa'),
    ('Discovery Bank Limited', '679000', 'South Africa'),
    ('Finbond EPE', '591000', 'South Africa'),
    ('Finbond Mutual Bank', '589000', 'South Africa'),
    ('First National Bank', '250655', 'South Africa'),
    ('FirstRand Bank', '201419', 'South Africa'),
    ('HBZ Bank (Westville)', '570226', 'South Africa'),
    ('HSBC South Africa', '587000', 'South Africa'),
    ('Investec Bank Ltd', '580105', 'South Africa'),
    ('JP Morgan South Africa', '432000', 'South Africa'),
    ('Nedbank', '198765', 'South Africa'),
    ('Olympus Mobile', '585001', 'South Africa'),
    ('OM Bank', '352000', 'South Africa'),
    ('Rand Merchant Bank', '261251', 'South Africa'),
    ('RMB Private Bank', '222026', 'South Africa'),
    ('SASFIN Bank', '683000', 'South Africa'),
    ('Société Générale South Africa', '351005', 'South Africa'),
    ('South African Bank of Athens', '410105', 'South Africa'),
    ('Standard Bank South Africa', '051001', 'South Africa'),
    ('Standard Chartered Bank', '730020', 'South Africa'),
    ('TymeBank', '678910', 'South Africa'),
    ('Ubank Ltd', '431010', 'South Africa'),
    ('VBS Mutual Bank', '588000', 'South Africa')
ON CONFLICT (code) DO NOTHING;

-- 3. Add bank_id column to bank_details and link it
ALTER TABLE public.bank_details ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.banks(id);

-- 4. Migrate existing settlement_bank text values to bank_id (match by code)
UPDATE public.bank_details bd
SET bank_id = b.id
FROM public.banks b
WHERE bd.settlement_bank = b.code AND bd.bank_id IS NULL;

-- 5. Drop the old settlement_bank column (the code is now in the banks table)
-- We keep it for now as a fallback, but bank_id is the new source of truth.
-- ALTER TABLE public.bank_details DROP COLUMN IF EXISTS settlement_bank;
