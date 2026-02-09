-- Allow admins to view all stores
CREATE POLICY "Admins can view all stores"
ON public.stores
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
