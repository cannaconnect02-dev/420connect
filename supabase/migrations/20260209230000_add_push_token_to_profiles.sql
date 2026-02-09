-- Migration: Add push_token column to profiles for push notifications
-- Rerunnable: Yes

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON public.profiles(push_token) WHERE push_token IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.push_token IS 'Expo push notification token for the user';
