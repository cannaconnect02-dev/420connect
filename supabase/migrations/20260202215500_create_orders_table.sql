-- Migration: Create orders table
-- Rerunnable: Yes (uses IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.profiles(id) NOT NULL,
    restaurant_id UUID REFERENCES public.restaurants(id) NOT NULL,
    driver_id UUID REFERENCES public.profiles(id), -- Nullable initially
    status TEXT CHECK (status IN ('pending', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled')) DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_location GEOGRAPHY(POINT) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

-- Create RLS policies (drop first to make rerunnable)

-- Customers can create orders
DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;
CREATE POLICY "Customers can create orders" ON public.orders 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = customer_id);

-- Customers can view their own orders
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
CREATE POLICY "Customers can view their own orders" ON public.orders 
    FOR SELECT TO authenticated 
    USING (auth.uid() = customer_id);

-- Merchants can view orders for their restaurants
DROP POLICY IF EXISTS "Merchants can view orders for their restaurants" ON public.orders;
CREATE POLICY "Merchants can view orders for their restaurants" ON public.orders 
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.restaurants r
            WHERE r.id = restaurant_id
            AND r.owner_id = auth.uid()
        )
    );

-- Merchants can update orders for their restaurants
DROP POLICY IF EXISTS "Merchants can update orders" ON public.orders;
CREATE POLICY "Merchants can update orders" ON public.orders 
    FOR UPDATE TO authenticated 
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

-- Drivers can view available or assigned orders
DROP POLICY IF EXISTS "Drivers can view available or assigned orders" ON public.orders;
CREATE POLICY "Drivers can view available or assigned orders" ON public.orders 
    FOR SELECT TO authenticated 
    USING (
        (driver_id = auth.uid())
        OR
        (status IN ('preparing', 'ready_for_pickup'))
    );

-- Drivers can update their assigned orders
DROP POLICY IF EXISTS "Drivers can update their assigned orders" ON public.orders;
CREATE POLICY "Drivers can update their assigned orders" ON public.orders 
    FOR UPDATE TO authenticated 
    USING (driver_id = auth.uid() OR driver_id IS NULL)
    WITH CHECK (driver_id = auth.uid());
