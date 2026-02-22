import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log("1. Starting generate-statement");
        const bodyText = await req.text();
        const bodyParams = bodyText ? JSON.parse(bodyText) : {};
        const { store_id, week_start_date, week_end_date } = bodyParams;

        console.log("2. Params:", { store_id, week_start_date, week_end_date });
        if (!store_id || !week_start_date || !week_end_date) {
            throw new Error('Missing required: store_id, week_start_date, week_end_date');
        }

        console.log("3. Creating admin client");
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || !supabaseKey) {
            console.error("CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
            throw new Error("Server configuration error");
        }

        const supabaseAdmin = createClient(
            supabaseUrl,
            supabaseKey,
            { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
        );

        console.log("4. Fetching store");
        const { data: store, error: storeError } = await supabaseAdmin
            .from('stores')
            .select('name, address, paystack_split_percentage')
            .eq('id', store_id)
            .maybeSingle();

        if (storeError) {
            console.error("Store Fetch Error:", storeError);
            throw new Error(`Error fetching store: ${storeError.message}`);
        }
        if (!store) {
            throw new Error(`Store not found in database for ID: ${store_id}`);
        }

        console.log("5. Store fetched, fetching settings");
        const { data: globalSettings, error: settingsError } = await supabaseAdmin
            .from('settings')
            .select('key, value')
            .in('key', ['global_vat_percent', 'global_paystack_fee_percent', 'global_markup_percent']);

        if (settingsError) {
            console.error("Settings Error:", settingsError);
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

        console.log("6. Settings fetched, fetching orders");
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

        if (ordersError) {
            console.error("Orders Fetch Error:", ordersError);
            throw new Error(`Error fetching orders: ${ordersError.message}`);
        }

        console.log("7. Orders fetched, fetching ledger");
        const { data: ledgerEntries, error: ledgerError } = await supabaseAdmin
            .from('store_ledger')
            .select('amount, description')
            .eq('store_id', store_id)
            .gte('created_at', week_start_date + 'T00:00:00.000Z')
            .lte('created_at', week_end_date + 'T23:59:59.999Z')
            .gt('amount', 0); // Positive means store owes us

        if (ledgerError) {
            console.error("Ledger Fetch Error:", ledgerError);
            throw new Error(`Error fetching ledger: ${ledgerError.message}`);
        }

        console.log("8. Math calculations");
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
                const itemTotal = item.quantity * Number(item.price_at_time || 0);
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
            totalDebt += Number(entry.amount || 0);
        }

        const netPayout = grossRevenue - totalPlatformMarkup - totalPaystackFee - totalDebt;

        console.log("9. Returning successful JSON");
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
        console.error('FATAL Statement Generation Error:', error.message, error.stack);

        try {
            // Write to debug_logs to see exactly what failed in production
            const adminClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
                { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
            );
            await adminClient.from('debug_logs').insert([{
                source: 'generate-statement',
                message: error.message,
                details: { stack: error.stack }
            }]);
        } catch (logErr) {
            console.error('Failed to write debug log:', logErr);
        }

        return new Response(
            JSON.stringify({ success: false, error: error.message, stack: error.stack }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }
});
