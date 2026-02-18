-- Migration: Fix all remaining restaurants references throughout the database
-- Rerunnable: Yes

-- 1. Drop and recreate views that reference 'restaurants' table
DROP VIEW IF EXISTS public.driver_orders_view;
DROP VIEW IF EXISTS public.merchant_orders_view;

-- Driver Orders View
CREATE VIEW public.driver_orders_view AS
SELECT
    o.id,
    o.status,
    o.total_amount,
    o.delivery_address,
    o.delivery_location,
    st_y(o.delivery_location::geometry) as lat,
    st_x(o.delivery_location::geometry) as lng,
    s.name as store_name,
    st_y(s.location::geometry) as store_lat,
    st_x(s.location::geometry) as store_lng,
    s.address as store_address,
    s.id as store_id
FROM public.orders o
JOIN public.stores s ON o.store_id = s.id;

-- Merchant Orders View
CREATE VIEW public.merchant_orders_view AS
SELECT
    o.*,
    s.name as store_name
FROM public.orders o
JOIN public.stores s ON o.store_id = s.id;

-- Security Invoker Settings for Views
ALTER VIEW public.driver_orders_view SET (security_invoker = true);
ALTER VIEW public.merchant_orders_view SET (security_invoker = true);

-- 2. Fix messages table RLS policies that reference restaurants
DROP POLICY IF EXISTS "Users can send messages on their orders" ON public.messages;
CREATE POLICY "Users can send messages on their orders" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_id
            AND (
                o.customer_id = auth.uid() OR
                o.driver_id = auth.uid() OR
                o.store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Users can view messages on their orders" ON public.messages;
CREATE POLICY "Users can view messages on their orders" ON public.messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_id
            AND (
                o.customer_id = auth.uid() OR
                o.driver_id = auth.uid() OR
                o.store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
            )
        )
    );

-- 3. Fix order_items RLS policies that reference restaurants
DROP POLICY IF EXISTS "Merchants can view order items for their restaurants" ON public.order_items;
DROP POLICY IF EXISTS "Merchants can view order items for their stores" ON public.order_items;
CREATE POLICY "Merchants can view order items for their stores" ON public.order_items
    FOR SELECT TO authenticated
    USING (
        order_id IN (
            SELECT o.id FROM public.orders o
            JOIN public.stores s ON o.store_id = s.id
            WHERE s.owner_id = auth.uid()
        )
    );

-- 4. Fix menu_items RLS policies that reference restaurants
DROP POLICY IF EXISTS "Merchants can insert menu items" ON public.menu_items;
CREATE POLICY "Merchants can insert menu items" ON public.menu_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.stores s 
            WHERE s.id = store_id 
            AND s.owner_id = auth.uid()
        )
    );
