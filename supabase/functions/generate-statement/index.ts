import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const bodyText = await req.text();
        const bodyParams = bodyText ? JSON.parse(bodyText) : {};
        const { store_id, week_start_date, week_end_date } = bodyParams;

        if (!store_id || !week_start_date || !week_end_date) {
            throw new Error('Missing required parameters: store_id, week_start_date, week_end_date');
        }

        // Verify user manually instead of relying on the API Gateway filter
        const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        const token = authHeader.replace(/^Bearer\s+/i, '').trim();

        const supabaseAuthClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
        );

        const { data: authData, error: authError } = await supabaseAuthClient.auth.getUser(token);
        if (authError || !authData?.user) {
            throw new Error(`Unauthorized (Invalid Token). Details: ${authError?.message || 'No user found'}`);
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
        );

        // 1. Fetch Store Details
        const { data: store, error: storeError } = await supabaseAdmin
            .from('stores')
            .select('name, address, paystack_split_percentage')
            .eq('id', store_id)
            .single();

        if (storeError || !store) throw new Error(`Error fetching store: ${storeError?.message}`);

        // 6. Fetch Global Settings
        const { data: globalSettings, error: settingsError } = await supabaseAdmin
            .from('settings')
            .select('key, value')
            .in('key', ['global_vat_percent', 'global_paystack_fee_percent', 'global_markup_percent']);

        if (settingsError) {
            throw new Error(`Failed to fetch settings: ${settingsError.message}`);
        }

        const vatSetting = globalSettings?.find((s: any) => s.key === 'global_vat_percent');
        const vatPercent = vatSetting ? (vatSetting.value.percent || 15) : 15;
        const vatRate = vatPercent / 100;

        const paystackSetting = globalSettings?.find((s: any) => s.key === 'global_paystack_fee_percent');
        const paystackPercent = paystackSetting ? (paystackSetting.value.percent || 2.9) : 2.9;
        const paystackRate = paystackPercent / 100;

        const markupSetting = globalSettings?.find((s: any) => s.key === 'global_markup_percent');
        const globalMarkupPercent = markupSetting ? (Number(markupSetting.value.percent || markupSetting.value) || 20) : 20;

        // 3. Fetch Successful Orders in timeframe
        const { data: orders, error: ordersError } = await supabaseAdmin
            .from('orders')
            .select(`
        id, 
        total_amount, 
        delivery_fee,
        paystack_split_percentage,
        order_items (
          menu_item_id,
          quantity,
          price_at_time,
          markup_at_time,
          menu_items ( name )
        )
      `)
            .eq('store_id', store_id)
            .eq('paystack_payment_status', 'charged')
            .gte('created_at', week_start_date + 'T00:00:00.000Z')
            .lte('created_at', week_end_date + 'T23:59:59.999Z');

        if (ordersError) throw new Error(`Error fetching orders: ${ordersError.message}`);

        // 4. Fetch Ledger Debt/Cancellation Fees
        const { data: ledgerEntries, error: ledgerError } = await supabaseAdmin
            .from('store_ledger')
            .select('amount, description')
            .eq('store_id', store_id)
            .gte('created_at', week_start_date + 'T00:00:00.000Z')
            .lte('created_at', week_end_date + 'T23:59:59.999Z')
            .gt('amount', 0); // Positive means store owes us

        if (ledgerError) throw new Error(`Error fetching ledger: ${ledgerError.message}`);

        // --- Perform Calculations ---
        let grossRevenue = 0;
        let totalPaystackFee = 0;
        let totalVAT = 0;
        let totalPlatformMarkup = 0;

        // Track items sold for breakdown
        const itemBreakdown: Record<string, { name: string, qty: number, revenue: number }> = {};

        for (const order of orders || []) {
            let orderItemsRevenue = 0;
            let orderItemsMarkup = 0;

            // Calculate the true 'Gross Revenue' for the store (Base Price * Qty)
            for (const item of order.order_items || []) {
                const itemTotal = item.quantity * Number(item.price_at_time);
                const itemMarkup = item.quantity * Number(item.markup_at_time || 0);

                orderItemsRevenue += itemTotal;
                orderItemsMarkup += itemMarkup;

                const id = item.menu_item_id;
                if (!itemBreakdown[id]) {
                    itemBreakdown[id] = { name: item.menu_items?.name || 'Unknown Item', qty: 0, revenue: 0 };
                }
                itemBreakdown[id].qty += item.quantity;
                itemBreakdown[id].revenue += itemTotal;
            }

            // The revenue subject to Paystack Fees is the base price revenue
            const gRev = orderItemsRevenue;
            grossRevenue += gRev;

            // Platform Markup per order is now the sum of item markups PLUS the delivery fee
            const orderDeliveryFee = Number(order.delivery_fee || 0);
            totalPlatformMarkup += (orderItemsMarkup + orderDeliveryFee);

            // Paystack fee: (Gross Revenue * Paystack % + 1) * (1 + VAT %)
            // Note: In reality, Paystack fee is charged on the TOTAL captured amount.
            // But per previous requirements, this aligns with the store's visible burden.
            totalPaystackFee += (gRev * paystackRate + 1) * (1 + vatRate);
        }

        let totalDebt = 0;
        for (const entry of ledgerEntries || []) {
            totalDebt += Number(entry.amount);
        }

        const netPayout = grossRevenue - totalPlatformMarkup - totalPaystackFee - totalDebt;

        // --- Return JSON Payload ---
        return new Response(
            JSON.stringify({
                success: true,
                storeName: store.name,
                storeAddress: store.address,
                grossRevenue,
                totalVAT,
                totalPlatformMarkup,
                totalPaystackFee,
                totalDebt,
                netPayout,
                vatRate,
                paystackRate,
                platformMarkupRate: null, // No longer a fixed rate
                itemBreakdown: Object.values(itemBreakdown)
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error: any) {
        console.error('Statement Generation Error:', error.message);
        return new Response(
            JSON.stringify({ success: false, error: error.message, stack: error.stack }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }
};

if (import.meta.main) {
    // @ts-ignore
    Deno.serve(handler);
}
