-- Migration: Differentiate cancellation sources
-- Up

-- 1. Add cancelled_by column to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cancelled_by TEXT CHECK (cancelled_by IN ('customer', 'merchant', 'system', 'timeout'));

-- 2. Update the trigger function to be source-aware
CREATE OR REPLACE FUNCTION public.apply_order_cancellation_fee()
RETURNS TRIGGER AS $$
DECLARE
    v_fee_amount NUMERIC;
BEGIN
    -- Only apply fee if:
    -- 1. Status changed to 'cancelled'
    -- 2. Source is explicitly 'merchant'
    IF (NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled')) THEN
        
        -- Check if it was cancelled by merchant
        IF (NEW.cancelled_by = 'merchant') THEN
            -- Get fee amount from settings (default to 20 if missing)
            SELECT COALESCE((value->>'amount')::NUMERIC, 20) INTO v_fee_amount
            FROM public.settings
            WHERE key = 'cancellation_fee';

            -- Insert into store_ledger
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

            RAISE NOTICE 'Applied cancellation fee of R% to store % for order %', v_fee_amount, NEW.store_id, NEW.id;
        ELSE
            RAISE NOTICE 'Skipping cancellation fee for order % (Cancelled by %)', NEW.id, COALESCE(NEW.cancelled_by, 'unknown');
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Down
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS cancelled_by;
