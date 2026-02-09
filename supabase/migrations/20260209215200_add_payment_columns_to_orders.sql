-- Migration: Add payment columns to orders table
-- Rerunnable: Yes (uses IF NOT EXISTS)

-- Add payment_ref column for storing Paystack transaction reference
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_ref TEXT;

-- Add payment_status column for tracking payment state
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending';

-- Note: If your orders table uses 'restaurant_id' instead of 'store_id', 
-- make sure the column name matches what's in the code.
-- The current schema uses 'restaurant_id', but the checkout code uses 'store_id'.
-- If you've renamed restaurants to stores, you may need to rename the column:
-- ALTER TABLE public.orders RENAME COLUMN restaurant_id TO store_id;
