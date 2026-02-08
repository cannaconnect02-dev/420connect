-- Add missing columns to menu_items table for product details
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'flower',
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'g',
ADD COLUMN IF NOT EXISTS thc_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cbd_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS strain_type TEXT DEFAULT 'hybrid';
