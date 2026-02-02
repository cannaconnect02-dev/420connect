-- =============================================================================
-- FIX DATABASE TRIGGERS & ADD STORES
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================================================

-- STEP 1: Drop and recreate the profile trigger with correct column name
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate the function with correct column (id, not user_id)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, store_name, address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'merchant'),
    COALESCE(NEW.raw_user_meta_data->>'store_name', 'New Store'),
    COALESCE(NEW.raw_user_meta_data->>'store_address', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    store_name = EXCLUDED.store_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- STEP 2: Add missing columns to profiles if needed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'cannabis';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_logo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS operating_hours TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- STEP 3: Create store_members table if not exists
CREATE TABLE IF NOT EXISTS store_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    membership_number TEXT NOT NULL,
    id_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can manage their members" ON store_members;
CREATE POLICY "Store owners can manage their members"
ON store_members FOR ALL
USING (auth.uid() = store_owner_id);

-- =============================================================================
-- DONE! Now you can register stores via the frontend.
-- =============================================================================
SELECT 'Database fixed! You can now register stores via the frontend.' as message;
