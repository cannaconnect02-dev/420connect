-- Migration: Enforce cancellation attribution for data integrity
-- Description: Ensures cancelled_by is never NULL when status is 'cancelled'

-- 1. Add CHECK constraint to ensure attribution
-- We use a name that is descriptive of the requirement
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ensure_cancelled_by_is_set'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT ensure_cancelled_by_is_set 
        CHECK (status != 'cancelled' OR cancelled_by IS NOT NULL);
    END IF;
END $$;

-- 2. Harden the trigger function to be extremely explicit
CREATE OR REPLACE FUNCTION public.apply_order_cancellation_fee()
RETURNS TRIGGER AS $$
DECLARE
    v_fee_amount NUMERIC;
    v_cancelled_by TEXT;
BEGIN
    -- Only act if status changed to 'cancelled'
    IF (NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled')) THEN
        
        -- The CHECK constraint ensures cancelled_by IS NOT NULL at the end of the transaction.
        -- However, we can still use a default here if it was somehow omitted in a legacy-style call,
        -- though the constraint will reject the insert/update if it remains NULL.
        v_cancelled_by := NEW.cancelled_by;

        -- Log for data auditing
        RAISE NOTICE 'INTEGRITY CHECK: Order % cancelled by %. Previous status: %', NEW.id, v_cancelled_by, OLD.status;

        -- apply fee if merchant
        IF (v_cancelled_by = 'merchant') THEN
            SELECT COALESCE((value->>'amount')::NUMERIC, 20) INTO v_fee_amount
            FROM public.settings
            WHERE key = 'cancellation_fee';

            INSERT INTO public.store_ledger (
                store_id,
                type,
                amount,
                order_id,
                description
            ) VALUES (
                NEW.store_id,
                'cancellation_fee',
                v_fee_amount,
                NEW.id,
                format('Cancellation fee for Order #%s (Merchant Initiated)', NEW.id)
            );

            RAISE NOTICE 'LEDGER: Applied R% fee to store % (Order %)', v_fee_amount, NEW.store_id, NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
