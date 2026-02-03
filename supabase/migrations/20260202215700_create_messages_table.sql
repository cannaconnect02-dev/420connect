-- Migration: Create messages table for order chat
-- Rerunnable: Yes (uses IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ,
    type TEXT DEFAULT 'text' -- Type to distinguish system messages if needed
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;

-- Create RLS policies (drop first to make rerunnable)

-- Users can view messages if they are involved in the order
DROP POLICY IF EXISTS "Users can view order messages" ON public.messages;
CREATE POLICY "Users can view order messages" ON public.messages 
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = messages.order_id
            AND (
                o.customer_id = auth.uid() OR
                o.driver_id = auth.uid() OR
                o.restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
            )
        )
    );

-- Users involved in the order can send messages
DROP POLICY IF EXISTS "Users can send order messages" ON public.messages;
CREATE POLICY "Users can send order messages" ON public.messages 
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = messages.order_id
            AND (
                o.customer_id = auth.uid() OR
                o.driver_id = auth.uid() OR
                o.restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
            )
        )
    );
