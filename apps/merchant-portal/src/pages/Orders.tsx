import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { OrderList, type Order } from '@/components/orders/OrderList';
import { OrderDetailsDialog } from '@/components/orders/OrderDetailsDialog';

export default function Orders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        fetchOrders();
    }, [statusFilter]);

    async function fetchOrders() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user's restaurant first
        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle();

        if (!restaurant) {
            setOrders([]);
            setLoading(false);
            return;
        }

        let query = supabase
            .from('orders')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
            // Map UI status 'completed' to DB status 'delivered' or 'picked_up' if needed
            if (statusFilter === 'delivered') {
                query = query.in('status', ['delivered', 'picked_up']);
            } else {
                query = query.eq('status', statusFilter);
            }
        }

        const { data } = await query;

        if (data) {
            // Mock data enrichment (names/items) since we don't have full relations logic in this snippet yet
            const enriched = data.map(o => ({
                ...o,
                customer_name: o.customer_name || "Customer " + o.id.slice(0, 3).toUpperCase(),
                items_count: Math.floor(Math.random() * 5) + 1
            }));
            setOrders(enriched);
        }
        setLoading(false);
    }

    // Client-side search filtering
    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.customer_name && order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
    });

    // Compute status counts for the ribbon
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const readyCount = orders.filter(o => o.status === 'ready').length;
    const deliveredCount = orders.filter(o => o.status === 'delivered').length;

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Orders</h1>
                    <p className="text-slate-400 text-lg">Manage and fulfil your customer orders.</p>
                </div>

                {/* Stats Ribbon */}
                <div className="flex gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-amber-500">{pendingCount}</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Pending</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-green-500">{readyCount}</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Ready</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 flex flex-col items-center min-w-[100px] hidden md:flex">
                        <span className="text-2xl font-bold text-blue-500">{deliveredCount}</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Done</span>
                    </div>
                </div>
            </div>

            <OrderFilters
                currentStatus={statusFilter}
                onStatusChange={setStatusFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            <OrderList
                orders={filteredOrders}
                loading={loading}
                onViewOrder={(order) => {
                    setSelectedOrder(order);
                }}
                onUpdateStatus={async (orderId, newStatus) => {
                    // Optimistic update
                    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
                        .filter(o => newStatus !== 'cancelled' || o.id !== orderId));

                    const { error } = await supabase
                        .from('orders')
                        .update({ status: newStatus })
                        .eq('id', orderId);

                    if (error) {
                        console.error("Failed to update status", error);
                        fetchOrders();
                    } else {
                        // Auto-switch to the new status tab
                        if (newStatus !== 'cancelled') {
                            setStatusFilter(newStatus);
                        }
                    }
                }}
            />

            <OrderDetailsDialog
                open={!!selectedOrder}
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onUpdateStatus={async (orderId, newStatus) => {
                    // Optimistic update
                    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
                    if (selectedOrder) setSelectedOrder({ ...selectedOrder, status: newStatus });

                    const { error } = await supabase
                        .from('orders')
                        .update({ status: newStatus })
                        .eq('id', orderId);

                    if (error) {
                        console.error("Failed to update status", error);
                        // Revert on error
                        fetchOrders();
                    }
                }}
            />
        </div>
    );
}
