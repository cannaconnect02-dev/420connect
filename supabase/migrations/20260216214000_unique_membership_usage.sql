-- Migration: Enforce Unique Membership Usage
-- Ensures that a membership number can only be claimed by ONE customer per store.

-- Add unique constraint to customer_store_memberships
-- Correct logic: (store_id, membership_number) must be unique.
-- This prevents Customer B from claiming "MEM-123" if Customer A already claimed "MEM-123" at Store X.

CREATE UNIQUE INDEX IF NOT EXISTS customer_store_memberships_unique_usage
ON public.customer_store_memberships(store_id, membership_number);

-- If there are duplicates already (unlikely in dev), this migration might fail.
-- In that case, we'd need to clean up data first, but for now we assume clean state.
