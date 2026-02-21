import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StoreApprovals from '../StoreApprovals';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Check: () => <div data-testid="check" />,
    X: () => <div data-testid="x" />,
    Store: () => <div data-testid="store" />,
    Loader: () => <div data-testid="loader" />
}));

const mockStores = [
    {
        id: 'request-1',
        user_id: 'user-1',
        role: 'store_admin',
        status: 'pending',
        requested_at: '2026-02-21T00:00:00Z',
        profiles: {
            full_name: 'John Doe',
            stores: [
                {
                    name: 'Pending Store One',
                    registration_number: 'REG001'
                }
            ]
        }
    }
];

// Create generic query chain mock
const createMockChain = (returnData: any = null, returnCount: number | null = null) => {
    const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        update: vi.fn(() => chain), // Used for approving/rejecting
        then: (resolve: any) => resolve({ data: returnData, count: returnCount, error: null })
    };
    return chain;
};

// Mock Supabase Edge Functions
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

describe('Store Approvals Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockImplementation((table: string) => {
            if (table === 'role_requests') {
                return createMockChain(mockStores);
            }
            return createMockChain();
        });
    });

    it('renders the store approvals header', async () => {
        render(<StoreApprovals />);

        await waitFor(() => {
            expect(screen.getByText('Store Applications')).toBeInTheDocument();
            expect(screen.getByText('Review pending store owner requests')).toBeInTheDocument();
        });
    });

    it('displays pending stores from database', async () => {
        render(<StoreApprovals />);

        await waitFor(() => {
            expect(screen.getByText('Pending Store One')).toBeInTheDocument();
            expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
            expect(screen.getByText('Reg #: REG001')).toBeInTheDocument();
        });
    });

    it('handles store approval', async () => {
        mockInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });

        render(<StoreApprovals />);

        // Wait for store to render
        await waitFor(() => {
            expect(screen.getByText('Pending Store One')).toBeInTheDocument();
        });

        // Click approve button
        const approveButton = screen.getByRole('button', { name: /Approve Access/i });
        fireEvent.click(approveButton);

        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('review-store-application', {
                body: { requestId: 'request-1', status: 'approved' }
            });
        });
    });
});
