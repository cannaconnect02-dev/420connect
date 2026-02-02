
-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow Public Access to view files in 'avatars'
CREATE POLICY "Public Access Agents"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 3. Allow Authenticated Users to upload files to their own folder ('avatars/USER_ID/*')
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow Authenticated Users to update their own files
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
