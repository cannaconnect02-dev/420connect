-- Migration: Create functions and triggers
-- Rerunnable: Yes (uses CREATE OR REPLACE and DROP...IF EXISTS)

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, avatar_url)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'role', 'customer'), 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user (drop first to make rerunnable)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to check delivery radius
CREATE OR REPLACE FUNCTION check_delivery_radius()
RETURNS TRIGGER AS $$
DECLARE
    restaurant_loc GEOGRAPHY;
    dist_meters FLOAT;
BEGIN
    -- If delivery_location is null, allow (geocoding may happen later)
    IF NEW.delivery_location IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get restaurant location
    SELECT location INTO restaurant_loc
    FROM restaurants
    WHERE id = NEW.restaurant_id;

    -- Calculate distance
    dist_meters := ST_Distance(restaurant_loc, NEW.delivery_location);

    -- Check limit (30km = 30000 meters)
    IF dist_meters > 30000 THEN
        RAISE EXCEPTION 'Delivery address is too far from the restaurant. Maximum radius is 30km. Current distance: % km', round((dist_meters/1000)::numeric, 1);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for delivery radius check (drop first to make rerunnable)
DROP TRIGGER IF EXISTS check_radius_on_order ON orders;
CREATE TRIGGER check_radius_on_order
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION check_delivery_radius();
