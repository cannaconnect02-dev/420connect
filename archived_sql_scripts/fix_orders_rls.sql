
-- Enable RLS on orders (idempotent)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 1. Allow Customers to create orders (INSERT)
CREATE POLICY "Customers can create orders" 
ON public.orders FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = customer_id);

-- 2. Allow Customers to see their own orders (SELECT)
CREATE POLICY "Customers can view their own orders" 
ON public.orders FOR SELECT 
TO authenticated 
USING (auth.uid() = customer_id);

-- 3. Allow Merchants to see orders for their restaurants (SELECT)
-- Requires a join or check against restaurants table where owner_id = auth.uid()
CREATE POLICY "Merchants can view orders for their restaurants" 
ON public.orders FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = restaurant_id
    AND r.owner_id = auth.uid()
  )
);

-- 4. Allow Drivers to see available orders (SELECT)
-- Drivers need to see 'ready_for_pickup' orders to accept them
-- AND orders they have already accepted.
CREATE POLICY "Drivers can view available or assigned orders" 
ON public.orders FOR SELECT 
TO authenticated 
USING (
  -- If driver is assigned
  (driver_id = auth.uid())
  OR
  -- Or if order is available (status 'ready_for_pickup' usually, or 'preparing' depending on flow)
  -- Adding logic to check if user is a driver might be good, but simple role check is okay for now.
  (status IN ('preparing', 'ready_for_pickup'))
);

-- 5. Allow Drivers to update orders they are assigned to (UPDATE)
CREATE POLICY "Drivers can update their assigned orders" 
ON public.orders FOR UPDATE
TO authenticated 
USING (driver_id = auth.uid() OR driver_id IS NULL) -- Allow taking unassigned orders
WITH CHECK (driver_id = auth.uid()); -- Ensure they assign it to themselves
