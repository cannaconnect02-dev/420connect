-- Migration: Robust Cancellation Trigger
-- Up

CREATE OR REPLACE FUNCTION public.apply_order_cancellation_fee()
RETURNS TRIGGER AS $$
DECLARE
    v_fee_amount NUMERIC;
    v_cancelled_by TEXT;
BEGIN
    -- Only apply fee if status changed to 'cancelled'
    IF (NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled')) THEN
        
        -- Use provided cancelled_by or default to 'merchant' if missing
        -- We default to 'merchant' because customer/system cancellations are 
        -- expected to explicitly set their source. If it's null, it's likely 
        -- an old client or a manual store action.
        v_cancelled_by := COALESCE(NEW.cancelled_by, 'merchant');

        -- Log for debugging
        RAISE NOTICE 'Order % cancelled by %. Stage: %', NEW.id, v_cancelled_by, OLD.status;

        -- Only apply fee if it was cancelled by merchant
        IF (v_cancelled_by = 'merchant') THEN
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
                format('Cancellation fee for Order #%s', NEW.id)
            );

            RAISE NOTICE 'Applied cancellation fee of R% to store % for order %', v_fee_amount, NEW.store_id, NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
