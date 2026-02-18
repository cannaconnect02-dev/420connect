-- Migration: Implement Three-Tiered Pricing System
-- Rerunnable: Yes (uses IF NOT EXISTS, CREATE OR REPLACE, etc)

-- 1. Create 'settings' table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings" ON public.settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
  
-- Initialize default markup if not exists
INSERT INTO public.settings (key, value)
VALUES ('global_markup_percent', '{"percent": 20}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- 2. Add pricing columns to 'menu_items'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'base_price') THEN
        ALTER TABLE public.menu_items ADD COLUMN base_price NUMERIC;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'markup_value') THEN
        ALTER TABLE public.menu_items ADD COLUMN markup_value NUMERIC DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'final_price') THEN
        ALTER TABLE public.menu_items ADD COLUMN final_price NUMERIC;
    END IF;
END $$;


-- 3. Create Pricing Functions

-- Function to calculate pricing components
CREATE OR REPLACE FUNCTION public.calculate_product_pricing(p_base_price numeric, p_markup_percent numeric)
RETURNS TABLE(final_price numeric, markup_value numeric) AS $$
DECLARE
  raw_markup numeric;
  raw_total numeric;
  rounded_price numeric;
BEGIN
  -- Handle nulls gracefully
  IF p_base_price IS NULL THEN
    RETURN QUERY SELECT NULL::numeric, NULL::numeric;
    RETURN;
  END IF;

  raw_markup := p_base_price * (p_markup_percent / 100.0);
  raw_total := p_base_price + raw_markup;
  -- Round UP to nearest 5
  rounded_price := CEIL(raw_total / 5.0) * 5;
  
  RETURN QUERY SELECT rounded_price, raw_markup;
END;
$$ LANGUAGE plpgsql;


-- Trigger Function: Auto-recalculate on insert/update of base_price
CREATE OR REPLACE FUNCTION public.recalculate_product_price()
RETURNS TRIGGER AS $$
DECLARE
  markup_pct numeric;
  calc RECORD;
BEGIN
  -- Get global markup percent
  SELECT (value->>'percent')::numeric INTO markup_pct 
  FROM public.settings WHERE key = 'global_markup_percent';
  
  -- Default to 20% if setting missing or invalid
  IF markup_pct IS NULL THEN markup_pct := 20; END IF;
  
  -- Calculate new values
  SELECT * INTO calc FROM public.calculate_product_pricing(NEW.base_price, markup_pct);
  
  NEW.final_price := calc.final_price;
  NEW.markup_value := calc.markup_value;
  -- Keep the legacy 'price' column in sync with final_price for compatibility
  NEW.price := calc.final_price;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Create/Replace Trigger on menu_items
DROP TRIGGER IF EXISTS trg_recalculate_price ON public.menu_items;

CREATE TRIGGER trg_recalculate_price
BEFORE INSERT OR UPDATE OF base_price ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.recalculate_product_price();


-- Bulk Recalculation Function (for Admins when changing markup)
CREATE OR REPLACE FUNCTION public.recalculate_all_product_prices()
RETURNS integer AS $$
DECLARE
  markup_pct numeric;
  updated_count integer;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  SELECT (value->>'percent')::numeric INTO markup_pct 
  FROM public.settings WHERE key = 'global_markup_percent';
  
  IF markup_pct IS NULL THEN markup_pct := 20; END IF;
  
  -- Update all menu_items with valid base_price
  -- This will fire the trigger for each row, ensuring consistent logic
  -- However, for bulk, it might be faster to do direct update, but trigger ensures consistency.
  -- Let's do a direct update logic to avoid firing trigger overhead if we want, 
  -- BUT to ensure exactly same logic, let's use the same calculation formula here.
  
  WITH calculations AS (
    SELECT 
      id,
      base_price * (markup_pct / 100.0) as new_markup,
      CEIL((base_price + (base_price * (markup_pct / 100.0))) / 5.0) * 5 as new_final
    FROM public.menu_items
    WHERE base_price IS NOT NULL
  )
  UPDATE public.menu_items m
  SET 
    markup_value = c.new_markup,
    final_price = c.new_final,
    price = c.new_final
  FROM calculations c
  WHERE m.id = c.id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Initial Data Migration
-- Set base_price = current price for existing items (assuming current price was the 'cost' or we just treat it as such base for now)
-- The requirement is: "Initialize base_price = current price initially to preserve current pricing"
-- Wait, if we set base_price = current price, and then run recalculation with 20% markup, the final price will jump by 20%.
-- If we want to PRESERVE current price as the FINAL price, we would need to reverse calculate base_price.
-- However, the user prompt approved plan says: "Initialize base_price = current price initially... then run recalculation which will increase final prices by the markup % immediately."
-- So I will follow that direction.

UPDATE public.menu_items
SET base_price = price
WHERE base_price IS NULL;

-- Now trigger recalculation for all to populate markup_value and final_price
-- We can call the function, but need to bypass admin check or just run the logic directly for migration.
-- We'll just run SQL update directly here for the migration.

DO $$
DECLARE
  markup_pct numeric := 20; -- Default
BEGIN
  -- Try to get from settings if it was inserted
  SELECT (value->>'percent')::numeric INTO markup_pct 
  FROM public.settings WHERE key = 'global_markup_percent';
  
  IF markup_pct IS NULL THEN markup_pct := 20; END IF;

  UPDATE public.menu_items
  SET 
    markup_value = base_price * (markup_pct / 100.0),
    final_price = CEIL((base_price + (base_price * (markup_pct / 100.0))) / 5.0) * 5,
    price = CEIL((base_price + (base_price * (markup_pct / 100.0))) / 5.0) * 5
  WHERE base_price IS NOT NULL AND (final_price IS NULL OR markup_value IS NULL);
END $$;


-- 5. Security & Visibility Updates

-- A. Update menu_items RLS Policies
-- Remove existing public access to sensitive menu_items table
DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;

-- Add Admin unlimited access
DROP POLICY IF EXISTS "Admins can manage menu items" ON public.menu_items;
CREATE POLICY "Admins can manage menu items" ON public.menu_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- B. Create 'public_products' View (Security Definer)
-- This view filters out sensitive pricing info (base_price, markup_value)
-- By default, views run as the owner (Security Definer) unless security_invoker=true.
-- Since the owner (postgres) bypasses RLS, public users can SELECT from this view 
-- even though they cannot SELECT from menu_items directly.
CREATE OR REPLACE VIEW public.public_products AS
SELECT
    m.id,
    m.store_id,
    m.name,
    m.description,
    m.image_url,
    m.is_available,
    m.final_price as price, -- Expose final_price as 'price'
    m.created_at,
    s.name as store_name,
    s.is_open,
    s.is_verified
FROM public.menu_items m
JOIN public.stores s ON m.store_id = s.id
WHERE m.is_available = true 
  AND s.is_verified = true 
  AND s.is_open = true;

-- Ensure view runs with owner privileges (bypassing table RLS for public)
ALTER VIEW public.public_products SET (security_invoker = false);

-- Grant access to public view
GRANT SELECT ON public.public_products TO anon, authenticated, service_role;
