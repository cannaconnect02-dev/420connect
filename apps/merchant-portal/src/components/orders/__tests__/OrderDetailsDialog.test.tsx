import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OrderDetailsDialog } from '../OrderDetailsDialog';
import { type Order } from '../OrderList'; // Assuming type is exported

vi.mock('@/lib/supabase', () => {
    return {
        supabase: {
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({
                        data: [{ id: 'item1', quantity: 1, price_at_time: 150, menu_items: { name: 'Premium Cannabis Oil' } }],
                        error: null
                    })
                }))
            }))
        }
    };
});

// Mock Order
const mockOrder: Order = {
    id: '12345678-uuid',
    customer_id: 'cust_1',
    status: 'pending',
    total_amount: 150.00,
    created_at: new Date().toISOString(),
    customer_name: 'Test Customer'
};

describe('OrderDetailsDialog', () => {
    it('does not render when open is false', () => {
        render(
            <OrderDetailsDialog
                open={false}
                order={mockOrder}
                onClose={vi.fn()}
                onUpdateStatus={vi.fn()}
            />
        );
        expect(screen.queryByText('Test Customer')).not.toBeInTheDocument();
    });

    it('renders order details when open', async () => {
        render(
            <OrderDetailsDialog
                open={true}
                order={mockOrder}
                onClose={vi.fn()}
                onUpdateStatus={vi.fn()}
            />
        );
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
        expect(await screen.findByText(/Premium Cannabis Oil/i)).toBeInTheDocument(); // Mocked item
    });

    it('calls onUpdateStatus when action button is clicked', async () => {
        const onUpdateStatus = vi.fn().mockResolvedValue(undefined);
        render(
            <OrderDetailsDialog
                open={true}
                order={mockOrder} // Status is pending, so action should be "Accept Order" -> "preparing"
                onClose={vi.fn()}
                onUpdateStatus={onUpdateStatus}
            />
        );

        // Wait for order items to load to avoid unhandled state updates
        await screen.findByText(/Premium Cannabis Oil/i);

        const actionButton = screen.getByText(/Accept Order/i);
        await act(async () => {
            fireEvent.click(actionButton);
        });

        expect(onUpdateStatus).toHaveBeenCalledWith(mockOrder.id, 'preparing');
    });
});
