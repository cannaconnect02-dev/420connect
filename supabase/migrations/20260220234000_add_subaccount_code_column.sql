-- Migration: Add paystack_subaccount_code column to stores and orders
-- The paystack_splitcode column will now store the actual Paystack Transaction Split code
-- The new paystack_subaccount_code column stores the Paystack Subaccount code

-- 1. Drop the dependent view before altering
DROP VIEW IF EXISTS public.merchant_orders_view;

-- 2. Add to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS paystack_subaccount_code TEXT;

-- 3. Add to orders table  
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paystack_subaccount_code TEXT;

-- 4. Migrate existing data: move subaccount_code from paystack_splitcode to the new column
-- (only if paystack_splitcode contains a subaccount code like "ACCT_xxxx")
UPDATE public.stores
SET paystack_subaccount_code = paystack_splitcode,
    paystack_splitcode = NULL
WHERE paystack_splitcode IS NOT NULL AND paystack_splitcode LIKE 'ACCT_%';

-- 5. Recreate the merchant_orders_view to include the new column
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
    o.paystack_subaccount_code,
    s.name AS store_name
FROM orders o
JOIN stores s ON o.store_id = s.id;
