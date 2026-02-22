-- Add the Paystack Fee setting to the global settings table
INSERT INTO public.settings (key, value)
VALUES ('global_paystack_fee_percent', '{"percent": 2.9}'::jsonb)
ON CONFLICT (key) DO NOTHING;
