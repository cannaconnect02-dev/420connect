-- Migration to add delivery_fee to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0;
