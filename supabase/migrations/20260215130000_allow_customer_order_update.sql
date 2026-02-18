-- Migration: Allow customers to update their own orders
-- Needed for saving Paystack Reference after payment initiation

DROP POLICY IF EXISTS "Customers can update their own orders" ON public.orders;

CREATE POLICY "Customers can update their own orders" ON public.orders
    FOR UPDATE TO authenticated
    USING (auth.uid() = customer_id)
    WITH CHECK (auth.uid() = customer_id);
