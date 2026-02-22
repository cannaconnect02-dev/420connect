import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const handler = async (req: Request): Promise<Response> => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Missing PAYSTACK_SECRET_KEY configuration');
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );

    // Parse request body
    const { store_id, business_name, settlement_bank, account_number, subaccount_code, bank_id } = await req.json();

    if (!store_id || !business_name || !account_number) {
      throw new Error('Missing required fields (store_id, business_name, account_number)');
    }

    // NOTE: The percentage_charge is required by Paystack to create a subaccount,
    // but because we are calculating the platform fee dynamically at checkout 
    // (Sum of Markups + Delivery Fee + Debt), this subaccount percentage is overriden and ignored.
    // We hardcode it to 0.1% just to satisfy the Paystack API requirement.
    const percentage_charge = 0.1;

    // Resolve bank code: prefer bank_id lookup, fall back to settlement_bank
    let bankCode = settlement_bank;
    if (bank_id) {
      const { data: bankData, error: bankError } = await supabaseAdmin
        .from('banks')
        .select('code')
        .eq('id', bank_id)
        .single();
      if (bankError || !bankData) {
        throw new Error(`Could not find bank with id ${bank_id}`);
      }
      bankCode = bankData.code;
    }
    if (!bankCode) {
      throw new Error('Missing settlement_bank or bank_id');
    }

    let paystackResponse;
    let paystackData;

    // 2. Call Paystack API (Update or Create)
    if (subaccount_code) {
      // Update existing subaccount
      console.log(`Updating subaccount ${subaccount_code} via Paystack API`);
      paystackResponse = await fetch(`https://api.paystack.co/subaccount/${subaccount_code}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          business_name,
          settlement_bank: bankCode,
          account_number,
          percentage_charge
        })
      });
    } else {
      // Create new subaccount
      console.log(`Creating new subaccount for ${business_name} via Paystack API`);
      paystackResponse = await fetch(`https://api.paystack.co/subaccount`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          business_name,
          settlement_bank: bankCode,
          account_number,
          percentage_charge
        })
      });
    }

    paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      throw new Error(`Paystack API returned error: ${paystackData.message}`);
    }

    const returnedSubaccountCode = paystackData.data.subaccount_code;
    console.log(`Subaccount code: ${returnedSubaccountCode}`);

    // 3. Save code to Supabase
    console.log(`Saving to store ${store_id}: subaccount=${returnedSubaccountCode}`);
    const { error: dbError } = await supabaseAdmin
      .from('stores')
      .update({
        paystack_subaccount_code: returnedSubaccountCode
      })
      .eq('id', store_id);

    if (dbError) {
      throw new Error(`Failed to save to database: ${dbError.message}`);
    }

    // 4. Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subaccount saved successfully',
        data: {
          subaccount_code: returnedSubaccountCode
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Subaccount Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
};

if (import.meta.main) {
  Deno.serve(handler);
}
