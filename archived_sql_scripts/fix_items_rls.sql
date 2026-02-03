
-- Enable RLS on order_items (idempotent)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 1. Allow Customers to create order items (INSERT)
-- Check that the related order belongs to them.
-- Since this is an INSERT, we can't easily reference the row being inserted in a subquery without overhead, 
-- but we can reference the 'order_id' column of the new row.
-- Policies for INSERT WITH CHECK allow referencing the new row.
CREATE POLICY "Customers can insert order items" 
ON public.order_items FOR INSERT 
TO authenticated 
WITH CHECK (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
    and o.customer_id = auth.uid()
  )
);

-- 2. Allow Customers to view their own order items (SELECT)
CREATE POLICY "Customers can view their own order items" 
ON public.order_items FOR SELECT 
TO authenticated 
USING (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
    and o.customer_id = auth.uid()
  )
);

-- 3. Allow Merchants to view items for their orders (SELECT)
CREATE POLICY "Merchants can view items for their orders" 
ON public.order_items FOR SELECT 
TO authenticated 
USING (
  exists (
    select 1 from public.orders o
    join public.restaurants r on o.restaurant_id = r.id
    where o.id = order_items.order_id
    and r.owner_id = auth.uid()
  )
);

-- 4. Allow Drivers to view items for available/assigned orders (SELECT)
CREATE POLICY "Drivers can view items for relevant orders" 
ON public.order_items FOR SELECT 
TO authenticated 
USING (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
    and (
      o.driver_id = auth.uid()
      OR
      o.status IN ('preparing', 'ready_for_pickup')
    )
  )
);
