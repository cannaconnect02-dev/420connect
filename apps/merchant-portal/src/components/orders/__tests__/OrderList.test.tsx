import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OrderList, type Order } from '../OrderList';

// Factory Pattern for Orders
const createMockOrder = (overrides?: Partial<Order>): Order => ({
    id: '12345678-uuid',
    customer_id: 'cust_123',
    status: 'pending',
    total_amount: 150.00,
    created_at: new Date().toISOString(),
    items_count: 3,
    customer_name: 'Test Customer',
    ...overrides
});

describe('OrderList Component', () => {
    const defaultProps = {
        orders: [] as Order[],
        loading: false,
        onViewOrder: vi.fn(),
    };

    it('renders loading state correctly', () => {
        const { container } = render(<OrderList {...defaultProps} loading={true} />);
        expect(container.getElementsByClassName('animate-pulse').length).toBeGreaterThan(0);
    });

    it('renders empty state when no orders', () => {
        render(<OrderList {...defaultProps} orders={[]} />);
        expect(screen.getByText('No orders found')).toBeInTheDocument();
    });

    it('renders a list of orders with correct details', () => {
        const orders = [
            createMockOrder({ id: 'order-1', customer_name: 'Alice', total_amount: 100, status: 'ready' }),
            createMockOrder({ id: 'order-2', customer_name: 'Bob', total_amount: 200, status: 'pending' })
        ];

        render(<OrderList {...defaultProps} orders={orders} />);

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('R100.00')).toBeInTheDocument();
        expect(screen.getByText('ready')).toBeInTheDocument();
    });

    it('calls onViewOrder when a row is clicked', () => {
        const order = createMockOrder();
        const onViewOrder = vi.fn();

        render(<OrderList {...defaultProps} orders={[order]} onViewOrder={onViewOrder} />);

        // Find the cell containing the customer text (since onClick is on TableCell, not TableRow)
        const cell = screen.getByText('Test Customer');
        fireEvent.click(cell);

        expect(onViewOrder).toHaveBeenCalledWith(order);
    });
});
