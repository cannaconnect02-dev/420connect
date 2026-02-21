-- Migration: Adjustable Cancellation Fee & Orders Trigger
-- Up

-- 1. Insert default cancellation fee into settings
INSERT INTO public.settings (key, value)
VALUES ('cancellation_fee', '{"amount": 20}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Create function to apply cancellation fee
CREATE OR REPLACE FUNCTION public.apply_order_cancellation_fee()
RETURNS TRIGGER AS $$
DECLARE
    v_fee_amount NUMERIC;
BEGIN
    -- Only apply fee if status changed to 'cancelled'
    IF (NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled')) THEN
        
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger on orders table
DROP TRIGGER IF EXISTS trg_apply_cancellation_fee ON public.orders;
CREATE TRIGGER trg_apply_cancellation_fee
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.apply_order_cancellation_fee();

-- Down
-- DROP TRIGGER IF EXISTS trg_apply_cancellation_fee ON public.orders;
-- DROP FUNCTION IF EXISTS public.apply_order_cancellation_fee();
-- DELETE FROM public.settings WHERE key = 'cancellation_fee';
