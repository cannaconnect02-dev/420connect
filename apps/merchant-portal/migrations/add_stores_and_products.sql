-- =============================================================================
-- ADD STORE_TYPE COLUMN AND CREATE STORES WITH AUTH USERS
-- Run this FIRST in Supabase Dashboard > SQL Editor
-- =============================================================================

-- Add store_type column to profiles if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'store_type'
    ) THEN
        ALTER TABLE profiles ADD COLUMN store_type TEXT DEFAULT 'cannabis';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'operating_hours'
    ) THEN
        ALTER TABLE profiles ADD COLUMN operating_hours TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'website'
    ) THEN
        ALTER TABLE profiles ADD COLUMN website TEXT;
    END IF;
END $$;

-- =============================================================================
-- OPTION 1: Add stores directly to profiles (for demo/testing)
-- Note: These won't have auth login capability without creating auth.users
-- =============================================================================

-- 1. Herbsway (Herbal Medicine Store)
INSERT INTO profiles (id, full_name, store_name, phone, address, role, store_type, operating_hours, website, store_logo_url)
VALUES (
    gen_random_uuid(),
    'Herbsway Bellville',
    'Herbsway',
    '087 700 6514',
    '225b Voortrekker Rd, Bellville, Cape Town, 7530',
    'merchant',
    'herbal',
    'Mon-Fri 8-5:30, Sat 9-4, Sun Closed',
    'https://herbsway.co.za',
    'https://herbsway.co.za/wp-content/uploads/2023/03/herbsway-logo.png'
)
ON CONFLICT DO NOTHING;

-- Add Herbsway Products
INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, is_available)
SELECT 
    p.id,
    'Mpesu (For Men)',
    'Helps with: Cleaning your system, providing strong and hard erections, increasing sexual desire, and providing long-lasting performance. Made from natural Venda herbs. 500ml bottle.',
    350.00,
    'mens-health',
    50,
    'bottle',
    true
FROM profiles p WHERE p.store_name = 'Herbsway'
ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, is_available)
SELECT p.id, 'Dorobo (For Men & Women)', 'Helps with: Drop, Gonorrhea, Warts, STIs/STDs, Burning & Itching, Swollen Testicles, Painful Urination, Pain during sex, Vaginal Infection, Vaginal Discharges, Pelvic Pain, Skin Rash & more.', 280.00, 'herbal-remedy', 40, 'bottle', true
FROM profiles p WHERE p.store_name = 'Herbsway' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, is_available)
SELECT p.id, 'Herb Mix (For Men & Women)', 'Helps with: Kidney Disorder, Headaches, Veins, Sleeping Disorders, Gout, Piles, Lungs, Coughs, Body Pains, Diabetes, Arthritis, Ulcers, Bladder, Digestion, High Blood & more. 330ml bottle.', 220.00, 'wellness', 60, 'bottle', true
FROM profiles p WHERE p.store_name = 'Herbsway' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, is_available)
SELECT p.id, 'Mbumbelo (For Women)', 'Helps with: Boosting fertility, Cleaning the Womb, Painful periods, Heavy menstrual bleeding, Abdominal discomfort, Pelvic pressure or pain, Fibroids, Lower back pain, Pain during intimacy.', 320.00, 'womens-health', 45, 'bottle', true
FROM profiles p WHERE p.store_name = 'Herbsway' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, is_available)
SELECT p.id, 'African Potato (For Men & Women)', 'Helps with: Boosting immune system, HIV/AIDS, Mood Disorder, TB, Fighting Cancer, Allergies, Reduce Inflammation, Healthy Digestion, Prostate Problems, Intestinal Worms, Diabetes, Arthritis. 500ml bottle.', 380.00, 'immunity', 35, 'bottle', true
FROM profiles p WHERE p.store_name = 'Herbsway' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, is_available)
SELECT p.id, 'Congo Dust (For Men)', 'Helps with: Preventing Early Ejaculation, providing long-lasting performance. Applied externally for enhanced results. Small jar.', 250.00, 'mens-health', 30, 'jar', true
FROM profiles p WHERE p.store_name = 'Herbsway' ON CONFLICT DO NOTHING;

-- =============================================================================
-- 2. Green Leaf Dispensary (Cannabis Store)
-- =============================================================================

INSERT INTO profiles (id, full_name, store_name, phone, address, role, store_type, operating_hours)
VALUES (
    gen_random_uuid(),
    'Green Leaf Cape Town',
    'Green Leaf Dispensary',
    '021 555 1234',
    '45 Long Street, Cape Town City Centre, 8001',
    'merchant',
    'cannabis',
    'Mon-Sat 9-8, Sun 10-6'
)
ON CONFLICT DO NOTHING;

-- Green Leaf Products
INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, thc_percentage, cbd_percentage, strain_type, is_available)
SELECT p.id, 'OG Kush', 'Classic indica-dominant hybrid with earthy, pine flavor. Perfect for relaxation and stress relief.', 180.00, 'flower', 100, 'g', 22.5, 0.5, 'indica', true
FROM profiles p WHERE p.store_name = 'Green Leaf Dispensary' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, thc_percentage, cbd_percentage, strain_type, is_available)
SELECT p.id, 'Durban Poison', 'Pure South African sativa with sweet smell and energetic effects. Great for daytime use.', 200.00, 'flower', 80, 'g', 24.0, 0.3, 'sativa', true
FROM profiles p WHERE p.store_name = 'Green Leaf Dispensary' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, thc_percentage, cbd_percentage, strain_type, is_available)
SELECT p.id, 'Blue Dream', 'Popular hybrid offering full-body relaxation with gentle cerebral invigoration.', 190.00, 'flower', 90, 'g', 21.0, 1.0, 'hybrid', true
FROM profiles p WHERE p.store_name = 'Green Leaf Dispensary' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, thc_percentage, cbd_percentage, strain_type, is_available)
SELECT p.id, 'Pre-Roll Pack (5)', 'Five premium pre-rolled joints of mixed strains. Ready to smoke.', 150.00, 'pre-rolls', 50, 'pack', 20.0, 0.5, 'hybrid', true
FROM profiles p WHERE p.store_name = 'Green Leaf Dispensary' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, thc_percentage, cbd_percentage, strain_type, is_available)
SELECT p.id, 'CBD Oil 1000mg', 'Full-spectrum CBD oil for anxiety, pain, and sleep. Lab tested.', 450.00, 'tinctures', 40, 'bottle', 0.3, 33.0, 'hybrid', true
FROM profiles p WHERE p.store_name = 'Green Leaf Dispensary' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, thc_percentage, cbd_percentage, strain_type, is_available)
SELECT p.id, 'Gummy Bears 10-Pack', 'THC-infused gummy bears, 10mg each. Discreet and delicious.', 200.00, 'edibles', 60, 'pack', 10.0, 2.0, 'hybrid', true
FROM profiles p WHERE p.store_name = 'Green Leaf Dispensary' ON CONFLICT DO NOTHING;

-- =============================================================================
-- 3. Kush Kingdom (Cannabis Store)
-- =============================================================================

INSERT INTO profiles (id, full_name, store_name, phone, address, role, store_type, operating_hours)
VALUES (
    gen_random_uuid(),
    'Kush Kingdom JHB',
    'Kush Kingdom',
    '011 444 5678',
    '123 Commissioner Street, Johannesburg CBD, 2001',
    'merchant',
    'cannabis',
    'Mon-Sun 10-9'
)
ON CONFLICT DO NOTHING;

-- Kush Kingdom Products
INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, thc_percentage, cbd_percentage, strain_type, is_available)
SELECT p.id, 'Purple Haze', 'Legendary sativa with berry undertones. Euphoric and creative high.', 220.00, 'flower', 70, 'g', 26.0, 0.2, 'sativa', true
FROM profiles p WHERE p.store_name = 'Kush Kingdom' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, thc_percentage, cbd_percentage, strain_type, is_available)
SELECT p.id, 'White Widow', 'Balanced hybrid famous worldwide. Powerful burst of euphoria and energy.', 210.00, 'flower', 85, 'g', 23.0, 0.8, 'hybrid', true
FROM profiles p WHERE p.store_name = 'Kush Kingdom' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, thc_percentage, cbd_percentage, strain_type, is_available)
SELECT p.id, 'Northern Lights', 'Pure indica with fast-acting relaxation. Medical-grade quality.', 195.00, 'flower', 95, 'g', 20.0, 1.5, 'indica', true
FROM profiles p WHERE p.store_name = 'Kush Kingdom' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, thc_percentage, cbd_percentage, strain_type, is_available)
SELECT p.id, 'Vape Cartridge - Mango', 'Premium THC oil cartridge with mango terpenes. Compatible with 510 batteries.', 350.00, 'vapes', 30, 'cartridge', 85.0, 5.0, 'hybrid', true
FROM profiles p WHERE p.store_name = 'Kush Kingdom' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, thc_percentage, cbd_percentage, strain_type, is_available)
SELECT p.id, 'Shatter - Girl Scout Cookies', 'High-quality concentrate. Amber, glass-like texture. Extremely potent.', 400.00, 'concentrates', 25, 'g', 80.0, 2.0, 'hybrid', true
FROM profiles p WHERE p.store_name = 'Kush Kingdom' ON CONFLICT DO NOTHING;

INSERT INTO products (store_owner_id, name, description, price, category, stock_quantity, unit, thc_percentage, cbd_percentage, strain_type, is_available)
SELECT p.id, 'Chocolate Bar 100mg', 'Belgian chocolate infused with THC. 10 pieces, 10mg each.', 180.00, 'edibles', 45, 'bar', 10.0, 1.0, 'hybrid', true
FROM profiles p WHERE p.store_name = 'Kush Kingdom' ON CONFLICT DO NOTHING;

-- =============================================================================
-- VERIFY: Check all stores and product counts
-- =============================================================================

SELECT 
    p.store_name, 
    p.store_type,
    p.address,
    COUNT(pr.id) as product_count 
FROM profiles p 
LEFT JOIN products pr ON p.id = pr.store_owner_id 
WHERE p.role = 'merchant'
GROUP BY p.id, p.store_name, p.store_type, p.address
ORDER BY p.store_name;
