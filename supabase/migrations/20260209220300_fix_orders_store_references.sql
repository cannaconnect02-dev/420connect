-- Migration: Fix orders table references to use stores instead of restaurants
-- Rerunnable: Yes (uses DROP POLICY IF EXISTS)

-- Fix the foreign key column if it hasn't been renamed yet
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'restaurant_id'
    ) THEN
        ALTER TABLE public.orders RENAME COLUMN restaurant_id TO store_id;
    END IF;
END $$;

-- Also update the foreign key constraint if needed
-- First drop the old constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_restaurant_id_fkey' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders DROP CONSTRAINT orders_restaurant_id_fkey;
        ALTER TABLE public.orders ADD CONSTRAINT orders_store_id_fkey 
            FOREIGN KEY (store_id) REFERENCES public.stores(id);
    END IF;
END $$;

-- Recreate RLS policies with correct table references (stores instead of restaurants)

-- Merchants can view orders for their stores
DROP POLICY IF EXISTS "Merchants can view orders for their restaurants" ON public.orders;
DROP POLICY IF EXISTS "Merchants can view orders for their stores" ON public.orders;
CREATE POLICY "Merchants can view orders for their stores" ON public.orders 
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.stores s
            WHERE s.id = store_id
            AND s.owner_id = auth.uid()
        )
    );

-- Merchants can update orders for their stores
DROP POLICY IF EXISTS "Merchants can update orders" ON public.orders;
DROP POLICY IF EXISTS "Merchants can update orders for their stores" ON public.orders;
CREATE POLICY "Merchants can update orders for their stores" ON public.orders 
    FOR UPDATE TO authenticated 
    USING (
        store_id IN (
            SELECT id FROM public.stores WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        store_id IN (
            SELECT id FROM public.stores WHERE owner_id = auth.uid()
        )
    );
