-- Migration: Add Paystack Split Operations Columns
-- This migration adds subaccount details to the stores and orders tables for vendor splitting

-- 1. Drop the dependent view before altering the tables
DROP VIEW IF EXISTS public.merchant_orders_view;

-- 2. Add columns to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS paystack_splitcode TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS paystack_split_percentage NUMERIC;

-- 3. Add columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paystack_splitcode TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paystack_split_percentage NUMERIC;

-- 4. Recreate the view including the new columns
CREATE OR REPLACE VIEW public.merchant_orders_view AS
SELECT
    o.id,
    o.customer_id,
    o.store_id,
    o.driver_id,
    o.status,
    o.total_amount,
    o.delivery_address,
    o.delivery_location,
    o.created_at,
    o.updated_at,
    o.paystack_reference,
    o.paystack_payment_status,
    o.paystack_splitcode,
    o.paystack_split_percentage,
    s.name AS store_name
FROM orders o
JOIN stores s ON o.store_id = s.id;
