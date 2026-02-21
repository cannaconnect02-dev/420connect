import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../Dashboard';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    DollarSign: () => <div data-testid="dollar-sign" />,
    ShoppingBag: () => <div data-testid="shopping-bag" />,
    Users: () => <div data-testid="users" />,
    Activity: () => <div data-testid="activity" />
}));

// Mock Recharts to avoid DOM issues in rendering SVGs
vi.mock('recharts', () => {
    return {
        ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
        BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
        Bar: () => <div data-testid="bar" />,
        XAxis: () => <div data-testid="xaxis" />,
        YAxis: () => <div data-testid="yaxis" />,
        CartesianGrid: () => <div data-testid="cartesian-grid" />,
        Tooltip: () => <div data-testid="tooltip" />,
        LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
        Line: () => <div data-testid="line" />
    };
});

describe('Admin Dashboard Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders dashboard layout and header', () => {
        render(<Dashboard />);

        expect(screen.getByText('System Overview')).toBeInTheDocument();
        expect(screen.getByText('Real-time platform metrics')).toBeInTheDocument();
    });

    it('loads and displays key performance metrics', () => {
        render(<Dashboard />);

        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
        expect(screen.getByText('Active Orders')).toBeInTheDocument();
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('System Health')).toBeInTheDocument();
    });

    it('renders chart sections', () => {
        render(<Dashboard />);
        expect(screen.getByText('Revenue Trends')).toBeInTheDocument();
        expect(screen.getByText('Order Volume')).toBeInTheDocument();
    });
});
