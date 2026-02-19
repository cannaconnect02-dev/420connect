// Supabase Edge Function: send-otp
// Generates a 6-digit OTP, stores it in database, and sends email

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, userId } = await req.json()

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: 'Email and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Generate OTP
    const otpCode = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Delete any existing OTPs for this user
    await supabase
      .from('email_otps')
      .delete()
      .eq('user_id', userId)

    // Store OTP in database
    const { error: insertError } = await supabase
      .from('email_otps')
      .insert({
        user_id: userId,
        email: email,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('Failed to insert OTP:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send email via Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@420connect.app',
          to: [email],
          subject: 'Your 420Connect Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #00FF00; text-align: center;">420Connect</h1>
              <div style="background-color: #121212; padding: 30px; border-radius: 16px; text-align: center;">
                <h2 style="color: #FFFFFF; margin-bottom: 20px;">Verify Your Email</h2>
                <p style="color: #A0A0A0; margin-bottom: 30px;">Use the code below to complete your registration:</p>
                <div style="background-color: #000000; padding: 20px; border-radius: 12px; border: 2px solid #00FF00;">
                  <span style="font-size: 32px; font-weight: bold; color: #00FF00; letter-spacing: 8px;">${otpCode}</span>
                </div>
                <p style="color: #A0A0A0; margin-top: 20px; font-size: 14px;">This code expires in 10 minutes.</p>
              </div>
              <p style="color: #666666; text-align: center; margin-top: 20px; font-size: 12px;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </div>
          `,
        }),
      })

      if (!emailResponse.ok) {
        console.error('Email send failed:', await emailResponse.text())
        // Don't fail the request - OTP is still stored
      }
    } else {
      console.log('RESEND_API_KEY not configured. OTP for testing:', otpCode)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent to email',
        // Include OTP in dev mode for testing (remove in production)
        ...(Deno.env.get('ENVIRONMENT') === 'development' && { devOtp: otpCode })
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Send OTP error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
