CREATE TABLE IF NOT EXISTS public.debug_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT,
    message TEXT,
    details JSONB
);
