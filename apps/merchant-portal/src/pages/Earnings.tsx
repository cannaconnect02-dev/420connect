import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DollarSign,
    TrendingUp,
    Calendar,
    Download,
    ArrowUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// Mock data for charts - in production this would come from the database
const mockDailyData = [
    { date: 'Jan 1', revenue: 2400, orders: 12 },
    { date: 'Jan 2', revenue: 1398, orders: 8 },
    { date: 'Jan 3', revenue: 3800, orders: 18 },
    { date: 'Jan 4', revenue: 2908, orders: 14 },
    { date: 'Jan 5', revenue: 4800, orders: 22 },
    { date: 'Jan 6', revenue: 3800, orders: 17 },
    { date: 'Jan 7', revenue: 4300, orders: 20 },
];

const mockMonthlyData = [
    { month: 'Jul', revenue: 45000 },
    { month: 'Aug', revenue: 52000 },
    { month: 'Sep', revenue: 48000 },
    { month: 'Oct', revenue: 61000 },
    { month: 'Nov', revenue: 55000 },
    { month: 'Dec', revenue: 67000 },
];

export default function Earnings() {
    const { user } = useAuth();
    const [period, setPeriod] = useState('7d');
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        platformFees: 0,
        netEarnings: 0,
        averageOrder: 0,
        growth: 12.5,
    });

    useEffect(() => {
        if (user) {
            fetchEarningsData();
        }
    }, [user, period]);

    const fetchEarningsData = async () => {
        try {
            const { data: store } = await supabase
                .from('stores')
                .select('id')
                .eq('owner_id', user?.id)
                .maybeSingle();

            if (store) {
                // Get date range based on period
                const now = new Date();
                let startDate = new Date();

                switch (period) {
                    case '7d':
                        startDate.setDate(now.getDate() - 7);
                        break;
                    case '30d':
                        startDate.setDate(now.getDate() - 30);
                        break;
                    case '90d':
                        startDate.setDate(now.getDate() - 90);
                        break;
                    default:
                        startDate.setDate(now.getDate() - 7);
                }

                const { data: orders } = await supabase
                    .from('orders')
                    .select('total, subtotal')
                    .eq('store_id', store.id)
                    .eq('status', 'delivered')
                    .gte('created_at', startDate.toISOString());

                const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
                const platformFees = totalRevenue * 0.1; // 10% platform fee
                const netEarnings = totalRevenue - platformFees;
                const averageOrder = orders?.length ? totalRevenue / orders.length : 0;

                setStats({
                    totalRevenue,
                    totalOrders: orders?.length || 0,
                    platformFees,
                    netEarnings,
                    averageOrder,
                    growth: 12.5, // Mock growth percentage
                });
            }
        } catch (error) {
            console.error('Error fetching earnings:', error);
        }
    };

    const exportReport = () => {
        // Create CSV export
        const headers = ['Metric', 'Value'];
        const rows = [
            ['Total Revenue', `R${stats.totalRevenue.toFixed(2)}`],
            ['Total Orders', stats.totalOrders.toString()],
            ['Platform Fees (10%)', `R${stats.platformFees.toFixed(2)}`],
            ['Net Earnings', `R${stats.netEarnings.toFixed(2)}`],
            ['Average Order', `R${stats.averageOrder.toFixed(2)}`],
        ];

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `earnings-report-${period}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Earnings</h1>
                    <p className="text-muted-foreground mt-1">Track your store's financial performance</p>
                </div>
                <div className="flex gap-2">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-36">
                            <Calendar className="w-4 h-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={exportReport} className="gap-2">
                        <Download className="w-4 h-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card border-border">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Revenue</p>
                                <p className="text-2xl font-bold text-foreground mt-1">R{stats.totalRevenue.toFixed(2)}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <ArrowUp className="w-3 h-3 text-emerald-400" />
                                    <span className="text-xs text-emerald-400">{stats.growth}%</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-emerald-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Net Earnings</p>
                                <p className="text-2xl font-bold text-foreground mt-1">R{stats.netEarnings.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground mt-1">After 10% platform fee</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Orders</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{stats.totalOrders}</p>
                                <p className="text-xs text-muted-foreground mt-1">Completed orders</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Average Order</p>
                                <p className="text-2xl font-bold text-foreground mt-1">R{stats.averageOrder.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Per order value</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle>Daily Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={mockDailyData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                                    <YAxis stroke="hsl(var(--muted-foreground))" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px'
                                        }}
                                        formatter={(value: any) => [`R${value}`, 'Revenue']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="hsl(var(--primary))"
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle>Monthly Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={mockMonthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                                    <YAxis stroke="hsl(var(--muted-foreground))" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px'
                                        }}
                                        formatter={(value: any) => [`R${value}`, 'Revenue']}
                                    />
                                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Fee Breakdown */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle>Fee Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
                            <div>
                                <p className="font-medium text-foreground">Gross Revenue</p>
                                <p className="text-sm text-muted-foreground">Total from all orders</p>
                            </div>
                            <span className="text-xl font-bold text-foreground">R{stats.totalRevenue.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10">
                            <div>
                                <p className="font-medium text-foreground">Platform Fee (10%)</p>
                                <p className="text-sm text-muted-foreground">420Connect service fee</p>
                            </div>
                            <span className="text-xl font-bold text-destructive">-R{stats.platformFees.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
                            <div>
                                <p className="font-medium text-foreground">Net Earnings</p>
                                <p className="text-sm text-muted-foreground">Your take-home amount</p>
                            </div>
                            <span className="text-xl font-bold text-primary">R{stats.netEarnings.toFixed(2)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
