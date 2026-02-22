-- Add unique constraint to weekly_statements
BEGIN;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'weekly_statements_store_id_week_start_date_key'
    ) THEN
        ALTER TABLE public.weekly_statements
        ADD CONSTRAINT weekly_statements_store_id_week_start_date_key UNIQUE (store_id, week_start_date);
    END IF;
END $$;

COMMIT;
