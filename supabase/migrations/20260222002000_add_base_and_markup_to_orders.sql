-- Migration to add base_amount and markup_amount to orders
-- This explicitly tracks the total base revenue and total markup for the order directly on the parent row

ALTER TABLE public.orders
ADD COLUMN base_amount numeric DEFAULT 0,
ADD COLUMN markup_amount numeric DEFAULT 0;
