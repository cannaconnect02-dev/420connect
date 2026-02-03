-- Migration: Create user_roles and role_requests tables
-- Rerunnable: Yes (uses IF NOT EXISTS)

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create role_requests table
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

-- Create RLS policies (drop first to make rerunnable)

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own requests" ON public.role_requests;
CREATE POLICY "Users can view their own requests" ON public.role_requests
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert requests" ON public.role_requests;
CREATE POLICY "Users can insert requests" ON public.role_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());
