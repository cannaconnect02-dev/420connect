-- Migration: Add markup_at_time to order_items
-- Rerunnable: Yes (uses IF NOT EXISTS)

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS markup_at_time numeric DEFAULT 0;
