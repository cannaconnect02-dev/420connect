
-- Function to check delivery radius
CREATE OR REPLACE FUNCTION check_delivery_radius()
RETURNS TRIGGER AS $$
DECLARE
    restaurant_loc GEOGRAPHY;
    dist_meters FLOAT;
BEGIN
    -- If delivery_location is null, we can't check (maybe allow or fail? safely allow if geocoding happens later, but for now assume it's provided)
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

-- Trigger
DROP TRIGGER IF EXISTS check_radius_on_order ON orders;

CREATE TRIGGER check_radius_on_order
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION check_delivery_radius();
