-- Migration: Customer Store Memberships + store_members table
-- Ensures store_members table exists and creates customer_store_memberships
-- for tracking verified memberships.

-- ============================================================
-- 1. Ensure store_members table exists (may already exist from
--    merchant portal manual migration, so use IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    membership_number TEXT NOT NULL,
    id_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique: one membership number per store owner
CREATE UNIQUE INDEX IF NOT EXISTS store_members_membership_unique
ON public.store_members(store_owner_id, membership_number);

ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- Store owners can manage their own members
DROP POLICY IF EXISTS "Store owners can manage their members" ON public.store_members;
CREATE POLICY "Store owners can manage their members"
ON public.store_members
FOR ALL
USING (auth.uid() = store_owner_id)
WITH CHECK (auth.uid() = store_owner_id);

-- Authenticated users can read store_members for verification lookup
DROP POLICY IF EXISTS "Authenticated users can verify membership" ON public.store_members;
CREATE POLICY "Authenticated users can verify membership"
ON public.store_members
FOR SELECT TO authenticated
USING (true);

-- ============================================================
-- 2. Create customer_store_memberships table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_store_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    membership_number TEXT NOT NULL,
    verified_at TIMESTAMPTZ DEFAULT now()
);

-- Unique: one membership per customer per store
CREATE UNIQUE INDEX IF NOT EXISTS customer_store_memberships_unique
ON public.customer_store_memberships(customer_id, store_id);

-- Enable RLS
ALTER TABLE public.customer_store_memberships ENABLE ROW LEVEL SECURITY;

-- Customers can view their own memberships
DROP POLICY IF EXISTS "Customers can view own memberships" ON public.customer_store_memberships;
CREATE POLICY "Customers can view own memberships"
ON public.customer_store_memberships
FOR SELECT TO authenticated
USING (auth.uid() = customer_id);

-- Customers can insert their own memberships
DROP POLICY IF EXISTS "Customers can insert own memberships" ON public.customer_store_memberships;
CREATE POLICY "Customers can insert own memberships"
ON public.customer_store_memberships
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = customer_id);
