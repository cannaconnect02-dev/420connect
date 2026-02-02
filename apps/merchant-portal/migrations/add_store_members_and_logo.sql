-- Create store_members table for merchant members
CREATE TABLE IF NOT EXISTS store_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    membership_number TEXT NOT NULL,
    id_number TEXT, -- Optional
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint for membership number per store
CREATE UNIQUE INDEX IF NOT EXISTS store_members_membership_unique 
ON store_members(store_owner_id, membership_number);

-- Enable RLS
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;

-- Policy: Store owners can manage their own members
CREATE POLICY "Store owners can manage their members"
ON store_members
FOR ALL
USING (auth.uid() = store_owner_id)
WITH CHECK (auth.uid() = store_owner_id);

-- Add store_logo_url to profiles table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'store_logo_url'
    ) THEN
        ALTER TABLE profiles ADD COLUMN store_logo_url TEXT;
    END IF;
END $$;
