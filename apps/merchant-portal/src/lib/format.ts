/**
 * South African Currency and Metrics Formatting Utilities
 * Professional package for consistent metric display across the dashboard
 */

// Currency formatting for South African Rand
export function formatZAR(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// Format with decimal places when needed
export function formatZARPrecise(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

// Compact format for large numbers (e.g., R42.5K)
export function formatZARCompact(amount: number): string {
    if (amount >= 1000000) {
        return `R${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
        return `R${(amount / 1000).toFixed(1)}K`;
    }
    return `R${amount}`;
}

// Format percentage with proper symbol
export function formatPercent(value: number, showSign = true): string {
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
}

// Format time duration
export function formatDuration(minutes: number): string {
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
}

// Format order count
export function formatCount(count: number): string {
    return new Intl.NumberFormat('en-ZA').format(count);
}

// Metric type definitions
export type MetricType = 'currency' | 'percentage' | 'duration' | 'count';

export interface MetricConfig {
    type: MetricType;
    label: string;
    icon: string;
    color: 'green' | 'blue' | 'amber' | 'purple' | 'pink';
}

// Predefined metric configurations
export const METRIC_CONFIGS: Record<string, MetricConfig> = {
    revenue: {
        type: 'currency',
        label: 'Total Revenue',
        icon: 'DollarSign',
        color: 'green',
    },
    orders: {
        type: 'count',
        label: 'Orders',
        icon: 'ClipboardCheck',
        color: 'blue',
    },
    avgTime: {
        type: 'duration',
        label: 'Avg. Time',
        icon: 'Clock',
        color: 'amber',
    },
    conversion: {
        type: 'percentage',
        label: 'Conversion',
        icon: 'TrendingUp',
        color: 'purple',
    },
};

// Format value based on metric type
export function formatMetricValue(value: number, type: MetricType): string {
    switch (type) {
        case 'currency':
            return formatZAR(value);
        case 'percentage':
            return `${value.toFixed(1)}%`;
        case 'duration':
            return formatDuration(value);
        case 'count':
            return formatCount(value);
        default:
            return String(value);
    }
}
