
-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ,
    
    -- Optional: Type to distinguish system messages if needed later
    type TEXT DEFAULT 'text'
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;

-- Policies

-- 1. View messages: Users can view messages if they are the customer, driver, or merchant (via restaurant) of the order.
DROP POLICY IF EXISTS "Users can view order messages" ON public.messages;
CREATE POLICY "Users can view order messages"
ON public.messages FOR SELECT
TO authenticated
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

-- 2. Send messages: Same logic, users involved in the order can send messages.
DROP POLICY IF EXISTS "Users can send order messages" ON public.messages;
CREATE POLICY "Users can send order messages"
ON public.messages FOR INSERT
TO authenticated
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
