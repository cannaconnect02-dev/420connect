-- Migration: Add Bank Details Table (Generic for Stores and Drivers)
-- This creates a central table to capture bank info for subaccount creation on Paystack

CREATE TABLE IF NOT EXISTS public.bank_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Assuming drivers use profiles table
    business_name TEXT NOT NULL,
    settlement_bank TEXT NOT NULL,
    account_number TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure either store_id or driver_id is present, but not both
    CONSTRAINT chk_owner CHECK (
        (store_id IS NOT NULL AND driver_id IS NULL) OR 
        (store_id IS NULL AND driver_id IS NOT NULL)
    ),
    -- Ensure a store can only have one active bank detail record
    CONSTRAINT uq_store_bank UNIQUE (store_id),
    -- Ensure a driver can only have one active bank detail record
    CONSTRAINT uq_driver_bank UNIQUE (driver_id)
);

-- Enable RLS
ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;

-- Admins can read all
CREATE POLICY "Admins can view all bank details"
    ON public.bank_details FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'system_admin'
        )
    );

-- Users can read their own store's bank details
CREATE POLICY "Users can view their own store bank details"
    ON public.bank_details FOR SELECT
    USING (
         store_id IN (
            SELECT store_id FROM customer_store_memberships
            WHERE customer_id = auth.uid()
        ) OR store_id IN (
            -- Or if they are the direct owner (checking user_roles if applicable)
            SELECT stores.id FROM stores
            JOIN user_roles ON user_roles.user_id = auth.uid()
            WHERE user_roles.role = 'store_admin'
            -- This might need adjusting depending on how store ownership is exactly mapped
        ) OR auth.uid() = driver_id
    );

-- Allow authenticated users to insert (we will rely on the app logic or trigger limits if needed)
-- A more strict approach: Only if they are store admin of that store, or it's their own driver profile
CREATE POLICY "Users can insert their own bank details"
    ON public.bank_details FOR INSERT
    WITH CHECK (
        auth.uid() = driver_id OR 
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'store_admin')
    );

-- Users can update their own bank details
CREATE POLICY "Users can update their own bank details"
    ON public.bank_details FOR UPDATE
    USING (
        auth.uid() = driver_id OR 
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'store_admin')
    );

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bank_details_modtime ON public.bank_details;
CREATE TRIGGER update_bank_details_modtime
    BEFORE UPDATE ON public.bank_details
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
