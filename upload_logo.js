
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://lxcwsuaxrogrzcmmsxum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3dzdWF4cm9ncnpjbW1zeHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzk4NDksImV4cCI6MjA4NDk1NTg0OX0.a9PbG_DF80ZLwd_uByY3rZRApBTVJ1eAo7r1EiY1ERk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MERCHANT = { email: 'merchant_test@test.com', password: 'Herbsway123!' };
const LOGO_PATH = '/Users/profshabangu/.gemini/antigravity/brain/8e614a77-f057-4be5-98bc-6019cfde728f/uploaded_media_1769569777924.png';

async function uploadLogo() {
    console.log(`Logging in as ${MERCHANT.email}...`);
    const { data: auth, error: loginError } = await supabase.auth.signInWithPassword(MERCHANT);

    if (loginError) {
        console.error("Login Failed:", loginError.message);
        return;
    }
    console.log(`Logged in. User ID: ${auth.user.id}`);

    // 1. Get Restaurant ID
    // Try 'restaurants' first (Schema name from dump)
    let tableName = 'restaurants';
    let { data: store, error: storeError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', auth.user.id)
        .single();

    if (storeError || !store) {
        console.log("Could not find in 'restaurants', trying 'stores'...");
        const { data: store2, error: storeError2 } = await supabase
            .from('stores')
            .select('*')
            .eq('owner_id', auth.user.id)
            .single();

        if (storeError2 || !store2) {
            console.error("Could not find store in 'restaurants' or 'stores'.");
            console.error("Restaurant Error:", storeError?.message);
            console.error("Store Error:", storeError2?.message);
            return;
        }
        tableName = 'stores';
        store = store2;
    }

    console.log(`Found Store: ${store.name || store.store_name} (${store.id}) in table '${tableName}'`);

    // 2. Upload Image
    const fileContent = fs.readFileSync(LOGO_PATH);
    const fileName = `${store.id}/logo_${Date.now()}.png`;

    console.log(`Uploading to bucket 'store-images' as ${fileName}...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('store-images')
        .upload(fileName, fileContent, {
            contentType: 'image/png',
            upsert: true
        });

    if (uploadError) {
        console.error("Upload Failed:", uploadError.message);
        return;
    }

    // 3. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('store-images')
        .getPublicUrl(fileName);

    console.log(`New Logo URL: ${publicUrl}`);

    // 4. Update Restaurant
    const { error: updateError } = await supabase
        .from(tableName)
        .update({ image_url: publicUrl })
        .eq('id', store.id);

    if (updateError) {
        console.log(`Update with 'image_url' failed (${updateError.message}), trying 'image' (Settings.tsx field)...`);
        const { error: updateError2 } = await supabase
            .from(tableName)
            .update({ image: publicUrl })
            .eq('id', store.id);

        if (updateError2) {
            console.log(`Update with 'image' failed (${updateError2.message}), trying 'store_logo_url' (Dashboard.tsx field)...`);
            const { error: updateError3 } = await supabase
                .from(tableName)
                .update({ store_logo_url: publicUrl })
                .eq('id', store.id);

            if (updateError3) {
                console.error("ALL Update Attempts Failed:", updateError3.message);
                return;
            }
        }
    }

    console.log("✅ Database updated successfully.");
}

uploadLogo();
