import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { handler } from "../index.ts";

// Setup Mock Environment Variables
const originalEnvGet = Deno.env.get;

// Helper to mock global fetch
let originalFetch: typeof fetch;

Deno.test({
    name: "Setup Mocks",
    fn() {
        Deno.env.get = (key: string) => {
            if (key === 'PAYSTACK_SECRET_KEY') return 'sk_test_mock';
            if (key === 'SUPABASE_URL') return 'https://mock.supabase.co';
            if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'mock_service_key';
            return originalEnvGet(key);
        };
        originalFetch = globalThis.fetch;
    }
});

Deno.test("paystack-subaccount handler missing fields", async () => {
    const req = new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });

    const res = await handler(req);
    assertEquals(res.status, 400);

    const body = await res.json();
    assertEquals(body.success, false);
    assertStringIncludes(body.error, "Missing required fields");

});

Deno.test("paystack-subaccount creates new subaccount and split code", async () => {
    // 1. Mock Fetch for Paystack & Supabase APIs.
    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
        const urlStr = input.toString();

        // Mock Supabase Bank lookup
        if (urlStr.includes('/rest/v1/banks')) {
            return new Response(JSON.stringify({ code: '058' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // Mock Supabase Store lookup (no split code yet)
        if (urlStr.includes('/rest/v1/stores') && urlStr.includes('select')) {
            return new Response(JSON.stringify({ paystack_splitcode: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // Mock Supabase Store update
        if (urlStr.includes('/rest/v1/stores') && init?.method === 'PATCH') {
            return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // Mock Paystack Subaccount Create
        if (urlStr === 'https://api.paystack.co/subaccount' && init?.method === 'POST') {
            return new Response(JSON.stringify({
                status: true,
                data: { subaccount_code: 'SUB_MOCK_123' }
            }), { status: 200 });
        }

        // Mock Paystack Split Create
        if (urlStr === 'https://api.paystack.co/split' && init?.method === 'POST') {
            return new Response(JSON.stringify({
                status: true,
                data: { split_code: 'SPLIT_MOCK_123' }
            }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: "Unmocked URL" }), { status: 500 });
    };

    const req = new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            store_id: 'store_1',
            business_name: 'Test Biz',
            account_number: '1234567890',
            percentage_charge: 5,
            bank_id: 'bank_1'
        }),
    });

    const res = await handler(req);
    assertEquals(res.status, 200);

    const body = await res.json();
    assertEquals(body.success, true);
    assertEquals(body.data.subaccount_code, 'SUB_MOCK_123');
    assertEquals(body.data.split_code, 'SPLIT_MOCK_123');

    // Restore fetch
    globalThis.fetch = originalFetch;
});

Deno.test("paystack-subaccount updates existing subaccount via Paystack API", async () => {
    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
        const urlStr = input.toString();

        if (urlStr.includes('/rest/v1/banks')) {
            return new Response(JSON.stringify({ code: '058' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (urlStr.includes('/rest/v1/stores') && urlStr.includes('select')) {
            return new Response(JSON.stringify({ paystack_splitcode: 'SPLIT_EXISTING' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (urlStr.includes('/rest/v1/stores') && init?.method === 'PATCH') {
            return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // Mock Paystack Subaccount UPDATE
        if (urlStr.includes('https://api.paystack.co/subaccount/SUB_EXISTING') && init?.method === 'PUT') {
            return new Response(JSON.stringify({
                status: true,
                data: { subaccount_code: 'SUB_EXISTING' }
            }), { status: 200 });
        }

        // Mock Paystack Split UPDATE
        if (urlStr.includes('https://api.paystack.co/split/SPLIT_EXISTING') && init?.method === 'PUT') {
            return new Response(JSON.stringify({
                status: true,
                data: { split_code: 'SPLIT_EXISTING' }
            }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: "Unmocked URL" }), { status: 500 });
    };

    const req = new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            store_id: 'store_1',
            business_name: 'Test Biz',
            account_number: '1234567890',
            percentage_charge: 5,
            bank_id: 'bank_1',
            subaccount_code: 'SUB_EXISTING'
        }),
    });

    const res = await handler(req);
    assertEquals(res.status, 200);

    const body = await res.json();
    assertEquals(body.success, true);
    assertEquals(body.data.subaccount_code, 'SUB_EXISTING');
    assertEquals(body.data.split_code, 'SPLIT_EXISTING');

    globalThis.fetch = originalFetch;
});

Deno.test("paystack-subaccount handles Paystack API errors gracefully", async () => {
    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
        const urlStr = input.toString();

        if (urlStr.includes('/rest/v1/banks')) {
            return new Response(JSON.stringify({ code: '058' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // Force Paystack Error
        if (urlStr === 'https://api.paystack.co/subaccount' && init?.method === 'POST') {
            return new Response(JSON.stringify({
                status: false,
                message: 'Invalid bank account'
            }), { status: 200 }); // Paystack often returns 200 with status: false
        }

        return new Response(JSON.stringify({ error: "Unmocked URL" }), { status: 500 });
    };

    const req = new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            store_id: 'store_1',
            business_name: 'Test Biz',
            account_number: 'invalid',
            percentage_charge: 5,
            bank_id: 'bank_1'
        }),
    });

    const res = await handler(req);
    assertEquals(res.status, 400);

    const body = await res.json();
    assertEquals(body.success, false);
    assertStringIncludes(body.error, "Invalid bank account");

    globalThis.fetch = originalFetch;
});

Deno.test({
    name: "Teardown Mocks",
    fn() {
        Deno.env.get = originalEnvGet;
    }
});
