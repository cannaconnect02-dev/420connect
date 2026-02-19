// Supabase Edge Function: verify-otp
// Validates OTP code and marks user as email verified

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { userId, otpCode } = await req.json()

        if (!userId || !otpCode) {
            return new Response(
                JSON.stringify({ error: 'userId and otpCode are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Supabase client with service role
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Find matching OTP
        const { data: otpRecord, error: fetchError } = await supabase
            .from('email_otps')
            .select('*')
            .eq('user_id', userId)
            .eq('otp_code', otpCode)
            .eq('verified', false)
            .single()

        if (fetchError || !otpRecord) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired verification code' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check if OTP has expired
        if (new Date(otpRecord.expires_at) < new Date()) {
            // Delete expired OTP
            await supabase
                .from('email_otps')
                .delete()
                .eq('id', otpRecord.id)

            return new Response(
                JSON.stringify({ error: 'Verification code has expired. Please request a new one.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Mark OTP as verified
        await supabase
            .from('email_otps')
            .update({ verified: true })
            .eq('id', otpRecord.id)

        // Update user's profile to mark email as verified
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ email_verified: true })
            .eq('id', userId)

        if (profileError) {
            console.error('Failed to update profile:', profileError)
            return new Response(
                JSON.stringify({ error: 'Failed to verify email' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Clean up - delete used OTP
        await supabase
            .from('email_otps')
            .delete()
            .eq('id', otpRecord.id)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Email verified successfully'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Verify OTP error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
