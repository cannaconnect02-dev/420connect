-- Migration: Create trigger to automatically create profile on signup
-- Rerunnable: Yes (uses CREATE OR REPLACE)

-- 1. Create the function that handles the new user
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
    address_confirmed
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'surname',
    new.raw_user_meta_data->>'preferred_name',
    (new.raw_user_meta_data->>'dob')::DATE,
    COALESCE((new.raw_user_meta_data->>'email_verified')::BOOLEAN, false),
    COALESCE((new.raw_user_meta_data->>'phone_verified')::BOOLEAN, false),
    false -- address_confirmed starts as false
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    surname = EXCLUDED.surname,
    preferred_name = EXCLUDED.preferred_name,
    date_of_birth = EXCLUDED.date_of_birth;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
