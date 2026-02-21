import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stores from '../Stores';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Store: () => <div data-testid="store" />,
    Loader: () => <div data-testid="loader" />,
    CreditCard: () => <div data-testid="credit-card" />,
    Building2: () => <div data-testid="building-2" />,
    AlertCircle: () => <div data-testid="alert-circle" />,
    Percent: () => <div data-testid="percent" />
}));

const mockStores = [
    {
        id: 'store-1',
        name: 'Alpha Dispensary',
        address: '100 Main St',
        is_active: true,
        created_at: '2026-02-01T00:00:00Z'
    },
    {
        id: 'store-2',
        name: 'Beta Cannabis',
        address: '200 Oak Ave',
        is_active: false,
        created_at: '2026-02-15T00:00:00Z'
    }
];

// Create generic query chain mock
const createMockChain = (returnData: any = null, returnCount: number | null = null) => {
    const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        maybeSingle: vi.fn(() => Promise.resolve({ data: returnData, error: null })),
        then: (resolve: any) => resolve({ data: returnData, count: returnCount, error: null })
    };
    return chain;
};

// Mock Supabase
let mockFrom = vi.fn();
let mockInvoke = vi.fn();

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: (table: string) => mockFrom(table),
        functions: {
            invoke: (...args: any[]) => mockInvoke(...args)
        }
    }
}));

describe('Stores Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockImplementation((table: string) => {
            if (table === 'stores') {
                return createMockChain(mockStores);
            }
            if (table === 'banks') {
                return createMockChain([]);
            }
            return createMockChain();
        });
    });

    it('renders the stores header and search bar', async () => {
        render(<Stores />);

        await waitFor(() => {
            expect(screen.getByText('Active Stores')).toBeInTheDocument();
            expect(screen.getByText('View stores and configure Paystack split payments')).toBeInTheDocument();
        });
    });

    it('displays active and inactive stores from database', async () => {
        render(<Stores />);

        await waitFor(() => {
            expect(screen.getByText('Alpha Dispensary')).toBeInTheDocument();
            expect(screen.getByText('Beta Cannabis')).toBeInTheDocument();
        });

        // Check if addresses are rendered
        expect(screen.getByText('100 Main St')).toBeInTheDocument();
        expect(screen.getByText('200 Oak Ave')).toBeInTheDocument();
    });

    it('handles store selection for split configuration', async () => {
        render(<Stores />);

        // Wait to load
        await waitFor(() => {
            expect(screen.getByText('Alpha Dispensary')).toBeInTheDocument();
        });

        const storeCard = screen.getByText('Alpha Dispensary');
        fireEvent.click(storeCard);

        await waitFor(() => {
            expect(screen.getByText('Configure Paystack Subaccount Split')).toBeInTheDocument();
        });
    });
});
