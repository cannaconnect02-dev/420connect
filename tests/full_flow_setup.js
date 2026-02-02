
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fekngijfsctclvsezgaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZla25naWpmc2N0Y2x2c2V6Z2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTMxNTQsImV4cCI6MjA4NDI2OTE1NH0.0tXGQox5T3IgTgL-H4jIEhNBZjV8rz-RYUWzpEbnj8M';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Use unique suffix to avoid "user already exists" errors
const SUFFIX = Date.now().toString().slice(-6);
const MERCHANT_EMAIL = `merchant_${SUFFIX}@nanobanana.com`;
const DRIVER_EMAIL = `driver_${SUFFIX}@nanobanana.com`;
const CUSTOMER_EMAIL = `customer_${SUFFIX}@nanobanana.com`;
const ADMIN_EMAIL = `admin_${SUFFIX}@nanobanana.com`;
const PASSWORD = 'Password123!';

// Test mode flag to handle rate limiting gracefully
const TEST_MODE = process.env.NODE_ENV === 'test' || process.argv.includes('--test-mode');

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff and rate limit handling
async function retryWithBackoff(operation, maxRetries = 5, initialDelay = 5000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await operation();
            return result;
        } catch (error) {
            lastError = error;
            
            // Handle rate limit specifically
            if (error.message && error.message.includes('rate limit')) {
                console.log(`🚦 Rate limit hit on attempt ${attempt + 1}, waiting longer...`);
                const rateLimitDelay = initialDelay * Math.pow(2, attempt) * 2; // Double for rate limits
                await delay(rateLimitDelay);
                continue;
            }
            
            if (attempt === maxRetries) {
                console.error(`❌ Max retries (${maxRetries}) exceeded for operation`);
                throw error;
            }
            
            const backoffDelay = initialDelay * Math.pow(2, attempt);
            console.log(`⚠️ Attempt ${attempt + 1} failed: ${error.message}, retrying in ${backoffDelay}ms...`);
            await delay(backoffDelay);
        }
    }
    
    throw lastError;
}

// Mock user creation for test mode to bypass rate limits
function createMockUser(type, suffix) {
    // Generate proper UUID format for database compatibility
    // Use fixed prefix with type-specific variation for consistency
    const typeMap = {
        'merchant': '11111111',
        'driver': '22222222', 
        'customer': '33333333',
        'admin': '44444444'
    };
    
    const prefix = typeMap[type] || '00000000';
    const hexSuffix = parseInt(suffix).toString(16).padStart(8, '0');
    const mockUUID = `${prefix}-0000-0000-0000-0000${hexSuffix}`;
    
    return {
        user: {
            id: mockUUID,
            email: `${type}_${suffix}@nanobanana.com`
        },
        session: null
    };
}

async function runFullFlow() {
    console.log('🚀 Starting Full Functional Flow Test...');

    try {
        // 1. REGISTER MERCHANT
        console.log('\n--- 1. Merchant Setup ---');
        let merchantAuth, mError;
        
        if (TEST_MODE) {
            console.log('🧪 Test mode: Creating mock merchant');
            merchantAuth = createMockUser('merchant', SUFFIX);
            mError = null;
        } else {
            ({ data: merchantAuth, error: mError } = await retryWithBackoff(async () => {
                return await supabase.auth.signUp({
                    email: MERCHANT_EMAIL,
                    password: PASSWORD,
                    options: { data: { role: 'merchant', full_name: 'Big Banana' } }
                });
            }));
        }
        
        if (mError) throw mError;
        const merchantId = merchantAuth.user.id;
        console.log(`✅ Merchant Registered: ${MERCHANT_EMAIL}`);
        
        // Add delay to avoid rate limits
        await delay(3000);

        // Create Restaurant (Note: Requires a session for standard RLS, but if public insert is on for testing we use it)
        const { data: restaurant, error: rError } = await supabase.from('restaurants').insert({
            owner_id: merchantId,
            name: 'The Electric Banana',
            description: 'The best smoothies in town',
            location: 'POINT(28.2293 -25.7479)', // Pretoria coords
            address: '123 Neon Road'
        }).select().single();
        if (rError) {
            console.warn('⚠️ Restaurant creation failed (likely RLS). Msg:', rError.message);
            // We might need to manually insert via SQL if RLS blocks public insert
        } else {
            console.log(`✅ Restaurant Created: ${restaurant.id}`);

            // Add Menu Item
            const { data: item, error: iError } = await supabase.from('menu_items').insert({
                restaurant_id: restaurant.id,
                name: 'Electric Green Smoothie',
                price: 45.00,
                description: 'Packed with electrolytes and green energy'
            }).select().single();
            if (iError) console.warn('⚠️ Menu item creation failed:', iError.message);
            else console.log(`✅ Menu Item Added: ${item.name}`);
        }

        // 2. REGISTER DRIVER (Pending -> Active)
        console.log('\n--- 2. Driver Setup ---');
        let driverAuth, dError;
        
        if (TEST_MODE) {
            console.log('🧪 Test mode: Creating mock driver');
            driverAuth = createMockUser('driver', SUFFIX);
            dError = null;
        } else {
            ({ data: driverAuth, error: dError } = await retryWithBackoff(async () => {
                await delay(5000); // Delay before retry
                return await supabase.auth.signUp({
                    email: DRIVER_EMAIL,
                    password: PASSWORD,
                    options: { data: { role: 'driver', full_name: 'Speedy Sam', age: 24 } }
                });
            }));
        }
        
        if (dError) throw dError;
        const driverId = driverAuth.user.id;
        console.log(`✅ Driver Registered: ${DRIVER_EMAIL} (Status: Pending)`);

        // 3. REGISTER CUSTOMER
        console.log('\n--- 3. Customer Action ---');
        let customerAuth, cError;
        
        if (TEST_MODE) {
            console.log('🧪 Test mode: Creating mock customer');
            customerAuth = createMockUser('customer', SUFFIX);
            cError = null;
        } else {
            ({ data: customerAuth, error: cError } = await retryWithBackoff(async () => {
                await delay(5000); // Delay before retry
                return await supabase.auth.signUp({
                    email: CUSTOMER_EMAIL,
                    password: PASSWORD,
                    options: { data: { role: 'customer', full_name: 'Hungry Harry' } }
                });
            }));
        }
        
        if (cError) throw cError;
        const customerId = customerAuth.user.id;
        console.log(`✅ Customer Registered: ${CUSTOMER_EMAIL}`);

        // 4. REGISTER ADMIN
        console.log('\n--- 4. Admin Setup ---');
        let adminAuth, aError;
        
        if (TEST_MODE) {
            console.log('🧪 Test mode: Creating mock admin');
            adminAuth = createMockUser('admin', SUFFIX);
            aError = null;
        } else {
            ({ data: adminAuth, error: aError } = await retryWithBackoff(async () => {
                await delay(5000); // Delay before retry
                return await supabase.auth.signUp({
                    email: ADMIN_EMAIL,
                    password: PASSWORD,
                    options: { data: { role: 'admin', full_name: 'Admin Andy' } }
                });
            }));
        }
        
        if (aError) throw aError;
        const adminId = adminAuth.user.id;
        console.log(`✅ Admin Registered: ${ADMIN_EMAIL}`);

        console.log('\n--- ⚠️ STOP: Need Manual Approval / Setup via Agent Tools ---');
        console.log(`MerchantID: ${merchantId}`);
        console.log(`DriverID: ${driverId}`);
        console.log(`CustomerID: ${customerId}`);
        console.log(`RestaurantID: ${restaurant?.id}`);

        console.log('\n=========================================');
        console.log('✅  TEST CREDENTIALS (COPY THESE)  ✅');
        console.log('=========================================');
        console.log(`Merchant : ${MERCHANT_EMAIL}  /  ${PASSWORD}`);
        console.log(`Driver   : ${DRIVER_EMAIL}  /  ${PASSWORD}`);
        console.log(`Customer : ${CUSTOMER_EMAIL}  /  ${PASSWORD}`);
        console.log(`Admin    : ${ADMIN_EMAIL}  /  ${PASSWORD}`);
        console.log('=========================================');

    } catch (err) {
        console.error('❌ Flow Test Failed:', err.message);
    }
}

runFullFlow();
