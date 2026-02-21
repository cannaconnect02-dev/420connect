-- Migration: Create store ledger and balance trigger
-- Up
CREATE TABLE IF NOT EXISTS public.store_ledger (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- e.g. 'cancellation_fee', 'payout_deduction', 'manual_adjustment'
    amount NUMERIC NOT NULL, -- Positive = Store owes us, Negative = Store paid us
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL, -- Optional link to specific orders
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add ledger_balance cached column to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS ledger_balance NUMERIC DEFAULT 0;

-- Create function to update balance
CREATE OR REPLACE FUNCTION public.update_store_ledger_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.stores
    SET ledger_balance = (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.store_ledger
        WHERE store_id = NEW.store_id
    )
    WHERE id = NEW.store_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger
CREATE TRIGGER on_store_ledger_insert
    AFTER INSERT OR UPDATE OR DELETE ON public.store_ledger
    FOR EACH ROW
    EXECUTE FUNCTION public.update_store_ledger_balance();

-- RLS
ALTER TABLE public.store_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stores can view their own ledger" 
ON public.store_ledger 
FOR SELECT 
USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'store_owner' AND store_id = store_ledger.store_id
));

CREATE POLICY "Admins can manage all ledgers" 
ON public.store_ledger 
FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Down
-- DROP TRIGGER IF EXISTS on_store_ledger_insert ON public.store_ledger;
-- DROP FUNCTION IF EXISTS public.update_store_ledger_balance();
-- ALTER TABLE public.stores DROP COLUMN IF EXISTS ledger_balance;
-- DROP TABLE IF EXISTS public.store_ledger;
