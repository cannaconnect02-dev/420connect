
-- Enable RLS on orders if not enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.order_items TO authenticated;

-- Policy: Merchants can view orders for their restaurant
DROP POLICY IF EXISTS "Merchants can view orders" ON public.orders;
CREATE POLICY "Merchants can view orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

-- Policy: Merchants can update orders for their restaurant
DROP POLICY IF EXISTS "Merchants can update orders" ON public.orders;
CREATE POLICY "Merchants can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

-- Policy: Customers can insert orders (already likely exists but ensuring)
DROP POLICY IF EXISTS "Customers can insert orders" ON public.orders;
CREATE POLICY "Customers can insert orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = customer_id
);

-- Policy: Customers can view their own orders
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
CREATE POLICY "Customers can view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  auth.uid() = customer_id
);

-- Policy: Drivers can view ready/picked up orders (simplified for now)
DROP POLICY IF EXISTS "Drivers can view available orders" ON public.orders;
CREATE POLICY "Drivers can view available orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  status IN ('ready_for_pickup', 'out_for_delivery', 'delivered')
);
