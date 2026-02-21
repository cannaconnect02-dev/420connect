import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Orders from './Orders';
import { BrowserRouter } from 'react-router-dom';

// Helper to create a chainable mock (same as Dashboard test, maybe reusable later)
const createMockChain = (returnData: any = null) => {
    const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        order: vi.fn(() => chain),
        maybeSingle: vi.fn(() => Promise.resolve({ data: returnData, error: null })),
        then: (resolve: any) => resolve({ data: returnData, error: null })
    };
    return chain;
};

// Mock Supabase
vi.mock('@/lib/supabase', () => {
    return {
        supabase: {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
            },
            channel: vi.fn(() => ({
                on: vi.fn().mockReturnThis(),
                subscribe: vi.fn(),
            })),
            removeChannel: vi.fn(),
            from: vi.fn((table) => {
                if (table === 'orders') {
                    const mockOrders = [
                        { id: '12345678', customer_id: 'cust_1', status: 'pending', total_amount: 150, created_at: '2023-01-01', customer_name: 'Alice' },
                        { id: '87654321', customer_id: 'cust_2', status: 'ready', total_amount: 200, created_at: '2023-01-02', customer_name: 'Bob' },
                        { id: '99999999', customer_id: 'cust_3', status: 'delivered', total_amount: 50, created_at: '2023-01-03', customer_name: 'Charlie' }
                    ];
                    return createMockChain(mockOrders);
                }
                if (table === 'stores') {
                    return createMockChain({ id: 'store_1' });
                }
                return createMockChain([]);
            })
        }
    };
});

describe('Orders Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders page header and stats ribbon', async () => {
        render(
            <BrowserRouter>
                <Orders />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Order Queue')).toBeInTheDocument();
        });

        // Stats Ribbon checks
        // Stats Ribbon checks (Kanban lanes)
        expect(await screen.findByText('New Orders')).toBeInTheDocument();
        expect(screen.getByText('Preparing')).toBeInTheDocument();
        expect(screen.getByText('Ready for Pickup')).toBeInTheDocument();
    });
});
