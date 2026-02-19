-- Migration: Create menu_items table
-- Rerunnable: Yes (uses IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop first to make rerunnable)
DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
CREATE POLICY "Public can view menu items" ON public.menu_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Merchants can manage their menu items" ON public.menu_items;
CREATE POLICY "Merchants can manage their menu items" ON public.menu_items 
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.restaurants r 
            WHERE r.id = menu_items.restaurant_id 
            AND r.owner_id = auth.uid()
        )
    );
