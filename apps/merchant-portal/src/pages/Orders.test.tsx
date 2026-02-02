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
        order: vi.fn(() => chain),
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
            from: vi.fn((table) => {
                if (table === 'orders') {
                    const mockOrders = [
                        { id: '12345678', customer_id: 'cust_1', status: 'pending', total_amount: 150, created_at: '2023-01-01', customer_name: 'Alice' },
                        { id: '87654321', customer_id: 'cust_2', status: 'ready', total_amount: 200, created_at: '2023-01-02', customer_name: 'Bob' },
                        { id: '99999999', customer_id: 'cust_3', status: 'delivered', total_amount: 50, created_at: '2023-01-03', customer_name: 'Charlie' }
                    ];
                    return createMockChain(mockOrders);
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
            expect(screen.getByText('Orders')).toBeInTheDocument();
        });

        // Stats Ribbon checks
        // Stats Ribbon checks
        expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Ready').length).toBeGreaterThan(0);
        expect(screen.getByText('Done')).toBeInTheDocument(); // Delivered mapped to Done in UI
    });

    it('filters orders by search', async () => {
        render(
            <BrowserRouter>
                <Orders />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeInTheDocument();
        });

        // Search for Bob
        const searchInput = screen.getByPlaceholderText(/search/i);
        fireEvent.change(searchInput, { target: { value: 'Bob' } });

        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });
});
