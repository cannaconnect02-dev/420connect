-- Migration: Drop redundant payment columns from orders
-- These are superseded by paystack_reference and paystack_payment_status
-- The merchant_orders_view depends on these columns, so we drop and recreate it.

-- 1. Drop the dependent view
DROP VIEW IF EXISTS public.merchant_orders_view;

-- 2. Drop the redundant columns
ALTER TABLE public.orders DROP COLUMN IF EXISTS payment_ref;
ALTER TABLE public.orders DROP COLUMN IF EXISTS payment_status;

-- 3. Recreate the view using the correct paystack columns
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
    s.name AS store_name
FROM orders o
JOIN stores s ON o.store_id = s.id;
