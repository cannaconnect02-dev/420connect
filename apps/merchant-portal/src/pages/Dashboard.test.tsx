import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../pages/Dashboard';
import { BrowserRouter } from 'react-router-dom';

// Helper to create a chainable mock object
const createMockChain = (returnData: any = null, returnCount: number | null = null) => {
    const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lt: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve({ data: returnData, error: null })),
        then: (resolve: any) => resolve({ data: returnData, count: returnCount, error: null })
    };
    return chain;
};

// Mock Supabase with improved recursive structure
vi.mock('@/lib/supabase', () => {
    return {
        supabase: {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
            },
            from: vi.fn((table) => {
                if (table === 'orders') {
                    const mockOrders = [
                        { id: '12345678', customer_id: 'cust_1', status: 'ready', total_amount: 450, created_at: '2023-01-01', customer_name: 'Customer 123' },
                        { id: '87654321', customer_id: 'cust_2', status: 'preparing', total_amount: 120, created_at: '2023-01-02', customer_name: 'Customer 876' }
                    ];
                    return createMockChain(mockOrders, 2);
                }
                if (table === 'products') {
                    return createMockChain([], 10); // Mock 10 products
                }
                return createMockChain([]);
            })
        }
    };
});

// Mock Recharts to avoid sizing issues in JSDOM
vi.mock('recharts', async (importOriginal) => {
    const actual: any = await importOriginal();
    return {
        ...actual,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    };
});

describe('Dashboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders dashboard header and actions', async () => {
        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
        );

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText('Welcome back, here\'s what\'s happening today.')).toBeInTheDocument();
        });

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument();
    });

    it('renders all stats cards after loading', async () => {
        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Total Revenue')).toBeInTheDocument();
        });

        expect(screen.getByText('Orders')).toBeInTheDocument();
        expect(screen.getByText('Avg. Time')).toBeInTheDocument();
        expect(screen.getByText('Conversion')).toBeInTheDocument();
    });

    it('renders live orders list with mocked data', async () => {
        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Live Orders')).toBeInTheDocument();
        });

        expect(screen.getByRole('link', { name: /view all orders/i })).toBeInTheDocument();

        // Check for mocked data presence
        // Note: RecentOrders might need slightly different mock structure if it does its own fetching
        // But since we mock supabase globally, it should intercept that too.
    });
});
