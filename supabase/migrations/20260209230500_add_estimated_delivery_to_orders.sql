-- Migration: Add estimated delivery and driver info columns to orders
-- Rerunnable: Yes

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS driver_name TEXT;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS driver_phone TEXT;

-- Comments for documentation
COMMENT ON COLUMN public.orders.estimated_delivery_at IS 'Estimated delivery time calculated when order is accepted';
COMMENT ON COLUMN public.orders.driver_name IS 'Name of assigned driver for easy display';
COMMENT ON COLUMN public.orders.driver_phone IS 'Phone number of assigned driver for customer contact';
