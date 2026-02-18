-- Migration: Fix check_delivery_radius function to use stores instead of restaurants
-- Rerunnable: Yes

-- Drop the old trigger first
DROP TRIGGER IF EXISTS check_radius_on_order ON orders;

-- Recreate the function with stores instead of restaurants
CREATE OR REPLACE FUNCTION check_delivery_radius()
RETURNS TRIGGER AS $$
DECLARE
    store_loc GEOGRAPHY;
    dist_meters FLOAT;
BEGIN
    -- If delivery_location is null, allow (geocoding may happen later)
    IF NEW.delivery_location IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get store location
    SELECT location INTO store_loc
    FROM stores
    WHERE id = NEW.store_id;

    -- If store has no location, allow the order
    IF store_loc IS NULL THEN
        RETURN NEW;
    END IF;

    -- Calculate distance
    dist_meters := ST_Distance(store_loc, NEW.delivery_location);

    -- Check limit (35km = 35000 meters)
    IF dist_meters > 35000 THEN
        RAISE EXCEPTION 'Delivery address is too far from the store. Maximum radius is 35km. Current distance: % km', round((dist_meters/1000)::numeric, 1);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER check_radius_on_order
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION check_delivery_radius();
