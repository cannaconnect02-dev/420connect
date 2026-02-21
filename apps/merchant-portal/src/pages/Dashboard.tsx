import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/MetricCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { AddProductDialog } from "@/components/menu/AddProductDialog";
import { formatZAR, formatPercent, formatDuration, formatCount } from "@/lib/format";
import { Download, Store } from "lucide-react";

export default function Dashboard() {
    const navigate = useNavigate();
    const [merchantName, setMerchantName] = useState<string>("");
    const [storeName, setStoreName] = useState<string>("");
    const [storeId, setStoreId] = useState<string | null>(null);
    const [storeLogo, setStoreLogo] = useState<string | null>(null);
    const [stats, setStats] = useState({
        todayRevenue: 42500,
        todayOrders: 156,
        avgTime: 24,
        conversion: 3.2,
    });

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch merchant profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name') // Only fetch available columns
                .eq('id', user.id)
                .single();

            if (profile) {
                setMerchantName(profile.full_name || user.email?.split('@')[0] || 'Merchant');
            } else {
                setMerchantName(user.email?.split('@')[0] || 'Merchant');
            }

            // Fetch store for store name, logo, and ID
            const { data: store } = await supabase
                .from('stores')
                .select('id, name, image_url')
                .eq('owner_id', user.id)
                .maybeSingle();

            if (store) {
                setStoreId(store.id);
                setStoreName(store.name || 'My Store');
                setStoreLogo(store.image_url || null);
            } else {
                setStoreId(null);
                setStoreName("");
                setStoreLogo(null);
            }

            if (store) {
                // Fetch today's orders using store_id
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const { data: ordersData } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('store_id', store.id)
                    .gte('created_at', today.toISOString());

                if (ordersData && ordersData.length > 0) {
                    setStats(prev => ({
                        ...prev,
                        todayRevenue: ordersData.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
                        todayOrders: ordersData.length,
                    }));
                }
            }
        }
        fetchData();
    }, []);

    // Export orders as CSV
    const handleExport = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch all orders
        const { data: allOrders } = await supabase
            .from('orders')
            .select('id, customer_id, status, total_amount, created_at')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        if (!allOrders || allOrders.length === 0) {
            alert('No orders to export');
            return;
        }

        // Convert to CSV
        const headers = ['Order ID', 'Customer ID', 'Status', 'Total Amount', 'Created At'];
        const csvRows = [
            headers.join(','),
            ...allOrders.map(order => [
                order.id,
                order.customer_id,
                order.status,
                order.total_amount,
                new Date(order.created_at).toLocaleString()
            ].join(','))
        ];
        const csvContent = csvRows.join('\n');

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-8">
            {/* Header with Merchant Name */}
            <header className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    {/* Store Logo - Clickable to edit profile */}
                    <div
                        onClick={() => navigate('/settings')}
                        className="cursor-pointer transition-opacity hover:opacity-80 group relative"
                        title="Edit Store Profile"
                    >
                        {storeLogo ? (
                            <img
                                src={storeLogo}
                                alt="Store Logo"
                                className="h-16 w-16 rounded-2xl object-cover border border-slate-700"
                            />
                        ) : (
                            <div className="h-16 w-16 flex items-center justify-center bg-green-500/20 rounded-2xl border border-slate-700">
                                <Store className="h-8 w-8 text-green-400" />
                            </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-medium">Edit</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-slate-400 text-sm">Welcome back</span>
                        <h1 className="text-3xl font-bold text-white">{merchantName}</h1>
                        <p className="text-slate-400">{storeName}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                    {!storeLogo && !storeName && (
                        <Button
                            onClick={async () => {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (!user) return;

                                const { error } = await supabase.from('stores').insert({
                                    owner_id: user.id,
                                    name: merchantName ? `${merchantName}'s Store` : 'My Store',
                                    is_verified: true,
                                    is_open: false,
                                    location: 'POINT(0 0)' // Default location to satisfy constraint
                                });

                                if (error) {
                                    alert('Error creating store: ' + error.message);
                                } else {
                                    alert('Store created successfully! Please refresh the page.');
                                    window.location.reload();
                                }
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-black font-bold animate-pulse"
                        >
                            ⚠️ Complete Setup
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        className="bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    <AddProductDialog onProductAdded={() => {
                        // Refresh data after adding product
                        console.log('Product added!');
                    }} />
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Revenue"
                    value={formatZAR(stats.todayRevenue)}
                    change={formatPercent(12.5)}
                    isPositive={true}
                    iconName="DollarSign"
                    iconColor="green"
                />
                <MetricCard
                    title="Orders"
                    value={formatCount(stats.todayOrders)}
                    change={formatPercent(4.2)}
                    isPositive={true}
                    iconName="ClipboardCheck"
                    iconColor="blue"
                />
                <MetricCard
                    title="Avg. Time"
                    value={formatDuration(stats.avgTime)}
                    change={formatPercent(-2.1, true)}
                    isPositive={false}
                    iconName="Clock"
                    iconColor="amber"
                />
                <MetricCard
                    title="Conversion"
                    value={`${stats.conversion}%`}
                    change={formatPercent(0.8)}
                    isPositive={true}
                    iconName="TrendingUp"
                    iconColor="purple"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RevenueChart />
                </div>
                <div className="lg:col-span-1">
                    <RecentOrders />
                </div>
            </div>
        </div>
    );
}
