-- Make location column nullable in stores table since we removed address from signup
ALTER TABLE public.stores ALTER COLUMN location DROP NOT NULL;
