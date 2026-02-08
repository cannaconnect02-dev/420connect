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
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { requestId, status, rejectionReason } = await req.json()

        if (!requestId || !status) {
            throw new Error('Missing requestId or status')
        }

        if (status !== 'approved' && status !== 'rejected') {
            throw new Error('Invalid status')
        }

        // Get the request details
        const { data: request, error: requestError } = await supabaseClient
            .from('role_requests')
            .select('*')
            .eq('id', requestId)
            .single()

        if (requestError || !request) {
            throw new Error('Request not found')
        }

        // Identify the user who is performing the action (the admin)
        // In a real edge function call, we should verify the user from the auth header
        // But since we use service role key here, we rely on the caller validation or RLS if we used anon key.
        // However, for admin actions, we often use service role key to bypass RLS for the update.

        // Update the request status
        const { error: updateError } = await supabaseClient
            .from('role_requests')
            .update({
                status: status,
                reviewed_at: new Date().toISOString(),
                rejection_reason: status === 'rejected' ? rejectionReason : null
            })
            .eq('id', requestId)

        if (updateError) throw updateError

        if (status === 'approved') {
            // Grant the role
            const { error: roleError } = await supabaseClient
                .from('user_roles')
                .insert({
                    user_id: request.user_id,
                    role: request.role
                })

            if (roleError) {
                // Check if role already exists, if so, ignore error
                if (!roleError.message.includes('unique constraint')) {
                    throw roleError
                }
            }

            // Update profile role as well for backward compatibility / primary role
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .update({ role: request.role })
                .eq('id', request.user_id)
                .select('store_name') // Fetch store_name to use for store creation
                .single()

            if (profileError) {
                console.error('Error updating profile role:', profileError)
            }

            // Create the Store Record
            // We need to check if it exists first to avoid duplicates
            const { data: existingStore } = await supabaseClient
                .from('stores')
                .select('id')
                .eq('owner_id', request.user_id)
                .single()

            if (!existingStore) {
                const { error: createStoreError } = await supabaseClient
                    .from('stores')
                    .insert({
                        owner_id: request.user_id,
                        name: profile?.store_name || 'New Store',
                        is_verified: true,
                        is_open: false,
                        // location is now nullable, so we can omit it or likely defaulted
                    })

                if (createStoreError) {
                    console.error('Error creating store record:', createStoreError)
                    throw new Error(`Failed to create store record: ${createStoreError.message}`)
                }
            }
        }

        return new Response(
            JSON.stringify({ success: true }),
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
