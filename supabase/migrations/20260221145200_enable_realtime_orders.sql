-- Migration: Enable real-time replication for orders table
-- Rerunnable: Yes (uses DROP then ADD to avoid errors if it already exists)

BEGIN;
  DO $$
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END $$;
  
  -- Required for realtime filtering on store_id during UPDATEs where store_id is not modified
  ALTER TABLE public.orders REPLICA IDENTITY FULL;
COMMIT;
