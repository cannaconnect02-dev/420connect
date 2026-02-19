-- Migration: Create order_items table
-- Rerunnable: Yes (uses IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) NOT NULL,
    menu_item_id UUID REFERENCES public.menu_items(id) NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_time DECIMAL(10, 2) NOT NULL -- Store price in case menu changes
);

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.order_items TO authenticated;

-- Create RLS policies (drop first to make rerunnable)

-- Customers can insert order items for their orders
DROP POLICY IF EXISTS "Customers can insert order items" ON public.order_items;
CREATE POLICY "Customers can insert order items" ON public.order_items 
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id
            AND o.customer_id = auth.uid()
        )
    );

-- Customers can view their own order items
DROP POLICY IF EXISTS "Customers can view their own order items" ON public.order_items;
CREATE POLICY "Customers can view their own order items" ON public.order_items 
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id
            AND o.customer_id = auth.uid()
        )
    );

-- Merchants can view items for their orders
DROP POLICY IF EXISTS "Merchants can view items for their orders" ON public.order_items;
CREATE POLICY "Merchants can view items for their orders" ON public.order_items 
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            JOIN public.restaurants r ON o.restaurant_id = r.id
            WHERE o.id = order_items.order_id
            AND r.owner_id = auth.uid()
        )
    );

-- Drivers can view items for relevant orders
DROP POLICY IF EXISTS "Drivers can view items for relevant orders" ON public.order_items;
CREATE POLICY "Drivers can view items for relevant orders" ON public.order_items 
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id
            AND (
                o.driver_id = auth.uid()
                OR
                o.status IN ('preparing', 'ready_for_pickup')
            )
        )
    );
