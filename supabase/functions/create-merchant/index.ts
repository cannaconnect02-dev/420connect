import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, password, metadata } = await req.json()

        if (!email || !password) {
            throw new Error('Missing email or password')
        }

        // Create the user with admin API to skip email verification
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Confirm email immediately
            user_metadata: metadata
        })

        if (error) throw error

        if (data.user) {
            // Explicitly create profile and role request to ensure they exist
            // This is safer than relying on triggers which might fail or have race conditions

            // 1. Create Profile
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: data.user.id,
                    role: 'merchant',
                    full_name: `${metadata.first_name} ${metadata.surname}`,
                    first_name: metadata.first_name,
                    surname: metadata.surname,
                    store_name: metadata.store_name
                })
                .select() // return data to ensure completion

            if (profileError && !profileError.message.includes('duplicate key')) {
                console.error('Error creating profile:', profileError)
            }

            // 2. Create Store
            // We expect the store details to be passed in metadata
            if (metadata.store_name) {
                console.log('--- START STORE CREATION ---')
                console.log(`Attempting to create store for user ${data.user.id}`)
                console.log('Store Metadata:', JSON.stringify({
                    name: metadata.store_name,
                    reg: metadata.registration_number,
                    doc: metadata.document_url
                }))

                const storePayload = {
                    owner_id: data.user.id,
                    name: metadata.store_name,
                    address: metadata.address,
                    latitude: metadata.latitude,
                    longitude: metadata.longitude,
                    is_active: false,
                    is_open: false,
                    registration_number: metadata.registration_number,
                    document_url: metadata.document_url,
                    is_verified: false
                }

                const { data: storeData, error: storeError } = await supabaseAdmin
                    .from('stores')
                    .insert(storePayload)
                    .select()

                if (storeError) {
                    console.error('CRITICAL: Error creating store:', storeError)
                    throw new Error(`Failed to create store: ${storeError.message}`)
                } else {
                    console.log('SUCCESS: Store created:', JSON.stringify(storeData))
                }
                console.log('--- END STORE CREATION ---')
            } else {
                console.warn('WARNING: Metadata missing store_name, skipping store creation. Metadata keys:', Object.keys(metadata))
            }

            // 3. Create Role Request
            const { error: requestError } = await supabaseAdmin
                .from('role_requests')
                .insert({
                    user_id: data.user.id,
                    role: 'store_admin',
                    status: 'pending'
                })

            if (requestError) {
                console.error('Error creating role request:', requestError)
            }
        }

        if (error) throw error

        return new Response(
            JSON.stringify(data),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
