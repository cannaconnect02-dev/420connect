-- Migration: Update trigger to map merchant metadata to profiles table
-- Rerunnable: Yes

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    first_name,
    surname,
    preferred_name,
    date_of_birth,
    email_verified,
    phone_verified,
    address_confirmed,
    store_name,
    registration_number,
    document_url
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'surname',
    new.raw_user_meta_data->>'preferred_name',
    CASE 
        WHEN new.raw_user_meta_data->>'date_of_birth' = '' THEN NULL 
        ELSE (new.raw_user_meta_data->>'date_of_birth')::DATE 
    END,
    COALESCE((new.raw_user_meta_data->>'email_verified')::BOOLEAN, false),
    COALESCE((new.raw_user_meta_data->>'phone_verified')::BOOLEAN, false),
    false,
    new.raw_user_meta_data->>'store_name',
    new.raw_user_meta_data->>'registration_number',
    new.raw_user_meta_data->>'document_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    surname = EXCLUDED.surname,
    preferred_name = EXCLUDED.preferred_name,
    date_of_birth = EXCLUDED.date_of_birth,
    store_name = EXCLUDED.store_name,
    registration_number = EXCLUDED.registration_number,
    document_url = EXCLUDED.document_url;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
