-- Migration: Add Max Delivery Distance Setting
-- Adds a configurable setting for the maximum delivery radius (in km).
-- Default is 35km.

INSERT INTO public.settings (key, value)
VALUES (
    'max_delivery_distance_km',
    '{"value": 35}'
)
ON CONFLICT (key) DO NOTHING;
