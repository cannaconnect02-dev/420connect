-- Migration: Create database views
-- Rerunnable: Yes (uses CREATE OR REPLACE VIEW)

-- Driver Orders View: Used by Driver App to see available orders or accepted details
CREATE OR REPLACE VIEW public.driver_orders_view AS
SELECT
    o.id,
    o.status,
    o.total_amount,
    o.delivery_address,
    o.delivery_location,
    st_y(o.delivery_location::geometry) as lat,
    st_x(o.delivery_location::geometry) as lng,
    r.name as restaurant_name,
    st_y(r.location::geometry) as restaurant_lat,
    st_x(r.location::geometry) as restaurant_lng,
    r.address as restaurant_address,
    r.id as restaurant_id
FROM public.orders o
JOIN public.restaurants r ON o.restaurant_id = r.id;

-- Merchant Orders View: Used by Merchant Portal
CREATE OR REPLACE VIEW public.merchant_orders_view AS
SELECT
    o.*,
    r.name as restaurant_name
FROM public.orders o
JOIN public.restaurants r ON o.restaurant_id = r.id;

-- Compatibility View for Merchant Portal (User Roles from profiles)
CREATE OR REPLACE VIEW public.user_roles_view AS
SELECT
    id as user_id,
    role
FROM public.profiles;

-- Security Invoker Settings for Views
ALTER VIEW public.driver_orders_view SET (security_invoker = true);
ALTER VIEW public.merchant_orders_view SET (security_invoker = true);
ALTER VIEW public.user_roles_view SET (security_invoker = true);
