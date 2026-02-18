-- Migration: Rename Restaurants to Stores & Add Role Request Workflow
-- WARNING: This is a breaking change for existing 'restaurants' tables
-- Re-runnable: Yes (uses IF EXISTS checks and DROP POLICY)

-- 1. Rename 'restaurants' table to 'stores'
ALTER TABLE IF EXISTS public.restaurants RENAME TO stores;

-- 2. Add 'is_verified' column to 'stores'
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 3. Rename 'restaurant_id' to 'store_id' in dependent tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'restaurant_id') THEN
        ALTER TABLE public.menu_items RENAME COLUMN restaurant_id TO store_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'restaurant_id') THEN
        ALTER TABLE public.orders RENAME COLUMN restaurant_id TO store_id;
    END IF;
END $$;

-- 4. Create or Update 'role_requests' table
CREATE TABLE IF NOT EXISTS public.role_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT
);

-- Ensure columns exist if table already existed (idempotency)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_requests' AND column_name = 'reviewed_at') THEN
        ALTER TABLE public.role_requests ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_requests' AND column_name = 'reviewed_by') THEN
        ALTER TABLE public.role_requests ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_requests' AND column_name = 'rejection_reason') THEN
        ALTER TABLE public.role_requests ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- 5. Create 'user_roles' table if not exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Enable RLS on new/renamed tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Update Policies
-- We drop policies first to ensure we can recreate them without errors

-- Stores Policies
DROP POLICY IF EXISTS "Public can view verified open stores" ON public.stores;
CREATE POLICY "Public can view verified open stores" ON public.stores
    FOR SELECT USING (is_verified = true AND is_open = true);

DROP POLICY IF EXISTS "Owners can view their own store" ON public.stores;
CREATE POLICY "Owners can view their own store" ON public.stores
    FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their own store" ON public.stores;
CREATE POLICY "Owners can update their own store" ON public.stores
    FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can insert their own store" ON public.stores;
CREATE POLICY "Owners can insert their own store" ON public.stores
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Menu Items Policies
DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
CREATE POLICY "Public can view menu items" ON public.menu_items
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage menu items" ON public.menu_items;
CREATE POLICY "Owners can manage menu items" ON public.menu_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.stores s
            WHERE s.id = menu_items.store_id
            AND s.owner_id = auth.uid()
        )
    );

-- Role Requests Policies
DROP POLICY IF EXISTS "Users can view their own requests" ON public.role_requests;
CREATE POLICY "Users can view their own requests" ON public.role_requests
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert requests" ON public.role_requests;
CREATE POLICY "Users can insert requests" ON public.role_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Roles Policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- 7. Update 'handle_new_user' Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_full_name text;
  v_store_name text;
  v_store_address text;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'customer');
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'New User');
  v_store_name := COALESCE(new.raw_user_meta_data->>'store_name', 'New Store');

  -- Insert into profiles
  INSERT INTO public.profiles (id, role, full_name, store_name)
  VALUES (
    new.id, 
    'customer', 
    v_full_name,
    v_store_name
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    store_name = EXCLUDED.store_name;

  -- Create Pending Role Request
  IF v_role = 'merchant' OR v_role = 'store_admin' THEN
    INSERT INTO public.role_requests (user_id, role, status)
    VALUES (new.id, 'store_admin', 'pending');
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
