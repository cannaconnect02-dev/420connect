-- Migration: Update handle_new_user function to map new profile fields
-- Rerunnable: Yes

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    u_first_name TEXT;
    u_surname TEXT;
    u_full_name TEXT;
BEGIN
    u_first_name := new.raw_user_meta_data->>'first_name';
    u_surname := new.raw_user_meta_data->>'surname';
    
    -- Construct full name if not explicitly provided
    u_full_name := new.raw_user_meta_data->>'full_name';
    IF u_full_name IS NULL AND u_first_name IS NOT NULL THEN
        u_full_name := u_first_name || ' ' || COALESCE(u_surname, '');
    END IF;

    INSERT INTO public.profiles (
        id, 
        role, 
        full_name, 
        first_name, 
        surname, 
        dob, 
        avatar_url
    )
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'role', 'customer'), 
        TRIM(u_full_name),
        u_first_name,
        u_surname,
        (new.raw_user_meta_data->>'dob')::DATE,
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
