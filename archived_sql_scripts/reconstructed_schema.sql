-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Fix: Enable RLS on spatial_ref_sys and allow public read access (required for PostGIS operations)
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polname = 'Allow public read access' 
        AND polrelid = 'public.spatial_ref_sys'::regclass
    ) THEN
        CREATE POLICY "Allow public read access" ON public.spatial_ref_sys FOR SELECT USING (true);
    END IF;
END $$;

GRANT SELECT ON public.spatial_ref_sys TO anon, authenticated, service_role;

-- 1. Users Table (Extends Supabase Auth)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role TEXT CHECK (role IN ('customer', 'merchant', 'driver', 'admin')) NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    current_location GEOGRAPHY(POINT), -- For drivers/customers
    vehicle_details JSONB, -- For drivers: { registration_number: string, ... }
    rejection_reason TEXT, -- For drivers: reason if status is 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Restaurants Table
CREATE TABLE public.restaurants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    location GEOGRAPHY(POINT) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Menu Items
CREATE TABLE public.menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Orders
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.profiles(id) NOT NULL,
    restaurant_id UUID REFERENCES public.restaurants(id) NOT NULL,
    driver_id UUID REFERENCES public.profiles(id), -- Nullable initially
    status TEXT CHECK (status IN ('pending', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'delivered', 'cancelled')) DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_location GEOGRAPHY(POINT) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Order Items
CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) NOT NULL,
    menu_item_id UUID REFERENCES public.menu_items(id) NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_time DECIMAL(10, 2) NOT NULL -- Store price in case menu changes
);

-- Indexes for Geospatial Search
CREATE INDEX restaurants_location_idx ON public.restaurants USING GIST (location);
CREATE INDEX profiles_location_idx ON public.profiles USING GIST (current_location);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'role', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- VIEWS (Reconstructed from codebase usage)

-- Driver Orders View: Used by Driver App to see available orders or accepted details
CREATE VIEW public.driver_orders_view AS
SELECT
    o.id,
    o.status,
    o.total_amount,
    o.delivery_address,
    o.delivery_location,
    st_y(o.delivery_location::geometry) as lat,
    st_x(o.delivery_location::geometry) as lng,
    r.name as restaurant_name,
    st_y(r.location::geometry) as restaurant_lat,
    st_x(r.location::geometry) as restaurant_lng,
    r.address as restaurant_address,
    r.id as restaurant_id
FROM public.orders o
JOIN public.restaurants r ON o.restaurant_id = r.id;

-- Merchant Orders View: Used by Merchant Portal
CREATE VIEW public.merchant_orders_view AS
SELECT
    o.*,
    r.name as restaurant_name
FROM public.orders o
JOIN public.restaurants r ON o.restaurant_id = r.id;

-- Security Invoker Settings for Views (from migrations)
ALTER VIEW public.driver_orders_view SET (security_invoker = true);
ALTER VIEW public.merchant_orders_view SET (security_invoker = true);
