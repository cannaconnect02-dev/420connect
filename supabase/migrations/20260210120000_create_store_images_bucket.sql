-- Create store-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to store images
DROP POLICY IF EXISTS "Public can view store images" ON storage.objects;
CREATE POLICY "Public can view store images"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-images');

-- Allow authenticated users to upload store images
DROP POLICY IF EXISTS "Authenticated users can upload store images" ON storage.objects;
CREATE POLICY "Authenticated users can upload store images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'store-images'
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their store images
DROP POLICY IF EXISTS "Authenticated users can update store images" ON storage.objects;
CREATE POLICY "Authenticated users can update store images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'store-images'
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their store images
DROP POLICY IF EXISTS "Authenticated users can delete store images" ON storage.objects;
CREATE POLICY "Authenticated users can delete store images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'store-images'
    AND auth.role() = 'authenticated'
);
