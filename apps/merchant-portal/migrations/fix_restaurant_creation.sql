-- Migration: Update user trigger to create restaurant
-- Run this in Supabase Dashboard > SQL Editor

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
  v_store_address := COALESCE(new.raw_user_meta_data->>'store_address', '');

  -- Insert into profiles
  INSERT INTO public.profiles (id, role, full_name, store_name, address)
  VALUES (
    new.id, 
    v_role,
    v_full_name,
    v_store_name,
    v_store_address
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    store_name = EXCLUDED.store_name;

  -- If merchant, creating a default restaurant
  IF v_role = 'merchant' THEN
    INSERT INTO public.restaurants (owner_id, name, address, location)
    VALUES (
      new.id,
      v_store_name,
      v_store_address,
      ST_SetSRID(ST_MakePoint(0, 0), 4326) -- Default location (0,0)
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger just in case
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill missing restaurants for existing merchants
INSERT INTO public.restaurants (owner_id, name, address, location)
SELECT 
  p.id, 
  p.store_name, 
  p.address,
  ST_SetSRID(ST_MakePoint(0, 0), 4326)
FROM public.profiles p
WHERE p.role = 'merchant'
  AND NOT EXISTS (SELECT 1 FROM public.restaurants r WHERE r.owner_id = p.id);
