
-- Create user_roles table if not exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create role_requests table if not exists
CREATE TABLE IF NOT EXISTS public.role_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

-- Add policies (simplified for MVP)
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their own requests" ON public.role_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert requests" ON public.role_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Grant store_admin role to our test merchant
INSERT INTO public.user_roles (user_id, role)
VALUES ('5908e6ac-f841-47fe-9ca7-15047bb06735', 'store_admin')
ON CONFLICT (user_id, role) DO NOTHING;
