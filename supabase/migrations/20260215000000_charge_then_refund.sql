-- Migration: Implement Charge-then-Refund Payment Architecture

-- 1. Create 'payment_methods' table
-- Stores reusable authorization codes for efficient future charges/refunds.
DO $$ BEGIN
    CREATE TYPE public.card_brand_enum AS ENUM ('Visa', 'Mastercard', 'Verve', 'American Express', 'Unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    paystack_authorization_code TEXT NOT NULL,
    card_last4 TEXT NOT NULL,
    card_brand TEXT DEFAULT 'Unknown',
    card_exp_month TEXT,
    card_exp_year TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own payment methods" ON public.payment_methods;
CREATE POLICY "Users can view their own payment methods"
    ON public.payment_methods FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payment methods" ON public.payment_methods;
CREATE POLICY "Users can insert their own payment methods"
    ON public.payment_methods FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own payment methods" ON public.payment_methods;
CREATE POLICY "Users can update their own payment methods"
    ON public.payment_methods FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own payment methods" ON public.payment_methods;
CREATE POLICY "Users can delete their own payment methods"
    ON public.payment_methods FOR DELETE
    USING (auth.uid() = user_id);


-- 2. Update 'orders' table
-- Add payment tracking columns per "Charge-then-Refund" architecture.

DO $$ BEGIN
    CREATE TYPE public.paystack_payment_status_enum AS ENUM ('charged', 'refunded', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES public.payment_methods(id),
    ADD COLUMN IF NOT EXISTS paystack_transaction_id TEXT,
    ADD COLUMN IF NOT EXISTS paystack_reference TEXT,
    ADD COLUMN IF NOT EXISTS paystack_payment_status public.paystack_payment_status_enum;


-- 3. Add 'matching_window_seconds' to settings
-- Configurable duration for Finding Store countdown (default 300s).

INSERT INTO public.settings (key, value)
VALUES ('matching_window_seconds', '{"seconds": 300}'::jsonb)
ON CONFLICT (key) DO NOTHING;
