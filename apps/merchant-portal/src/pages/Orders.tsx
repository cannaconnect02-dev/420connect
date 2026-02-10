import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KanbanLane } from '@/components/orders/KanbanLane';
import { type Order } from '@/components/orders/OrderList';
import { OrderDetailsDialog } from '@/components/orders/OrderDetailsDialog';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Orders() {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD
    });

    // ─── Fetch store ID on mount ─────────────────────────────
    useEffect(() => {
        async function getStore() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: store } = await supabase
                .from('stores')
                .select('id')
                .eq('owner_id', user.id)
                .maybeSingle();
            if (store) setStoreId(store.id);
        }
        getStore();
    }, []);

    // ─── Fetch orders for selected date ──────────────────────
    const fetchOrders = useCallback(async () => {
        if (!storeId) return;
        setLoading(true);

        const dayStart = `${selectedDate}T00:00:00.000Z`;
        const dayEnd = `${selectedDate}T23:59:59.999Z`;

        const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(id, quantity)')
            .eq('store_id', storeId)
            .gte('created_at', dayStart)
            .lte('created_at', dayEnd)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching orders:', error);
        } else if (data) {
            const enriched = data.map((o: any) => ({
                ...o,
                customer_name: o.customer_name || `Customer ${o.id.slice(0, 3).toUpperCase()}`,
                items_count: Array.isArray(o.order_items)
                    ? o.order_items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
                    : 0,
            }));
            setAllOrders(enriched);
        }
        setLoading(false);
    }, [storeId, selectedDate]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // ─── Real-time subscription ──────────────────────────────
    useEffect(() => {
        if (!storeId) return;

        const channel = supabase
            .channel('orders-kanban')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `store_id=eq.${storeId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newOrder = payload.new as Order;
                        // Only add if it falls within the selected date
                        const orderDate = new Date(newOrder.created_at).toISOString().split('T')[0];
                        if (orderDate === selectedDate) {
                            setAllOrders(prev => [
                                {
                                    ...newOrder,
                                    customer_name: newOrder.customer_name || `Customer ${newOrder.id.slice(0, 3).toUpperCase()}`,
                                    items_count: newOrder.items_count ?? 1,
                                },
                                ...prev,
                            ]);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as Order;
                        setAllOrders(prev =>
                            prev.map(o => o.id === updated.id ? { ...o, ...updated } : o)
                        );
                    } else if (payload.eventType === 'DELETE') {
                        const deleted = payload.old as { id: string };
                        setAllOrders(prev => prev.filter(o => o.id !== deleted.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [storeId, selectedDate]);

    // ─── Status update handler ───────────────────────────────
    async function handleAdvance(orderId: string, nextStatus: string) {
        // Optimistic update
        setAllOrders(prev =>
            prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o)
        );

        const { error } = await supabase
            .from('orders')
            .update({ status: nextStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId);

        if (error) {
            console.error('Failed to advance order:', error);
            fetchOrders(); // revert on failure
        }
    }

    async function handleCancel(orderId: string) {
        // Optimistic update
        setAllOrders(prev =>
            prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o)
        );

        const { error } = await supabase
            .from('orders')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', orderId);

        if (error) {
            console.error('Failed to cancel order:', error);
            fetchOrders();
        }
    }

    // ─── Derived lane data ───────────────────────────────────
    const newOrders = allOrders.filter(o => o.status === 'pending');
    const preparingOrders = allOrders.filter(o => o.status === 'preparing');
    const readyOrders = allOrders.filter(o => o.status === 'ready_for_pickup' || o.status === 'ready');

    // Global stats
    const totalActive = allOrders.filter(o =>
        !['cancelled', 'delivered', 'picked_up'].includes(o.status)
    ).length;

    return (
        <div className="h-full flex flex-col p-6 max-w-[1600px] mx-auto">
            {/* ── Header ───────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Order Queue
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {totalActive} active order{totalActive !== 1 ? 's' : ''} today
                    </p>
                </div>

                {/* Date Picker + Refresh */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-10 h-10 w-48 bg-slate-900/60 border-white/10 text-white rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 [color-scheme:dark]"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchOrders}
                        disabled={loading}
                        className="h-10 w-10 border-white/10 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* ── Loading skeleton ───────────────────────── */}
            {loading && allOrders.length === 0 ? (
                <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 space-y-3">
                            <div className="h-10 w-full bg-slate-900/50 rounded-xl animate-pulse" />
                            {[0, 1, 2].map(j => (
                                <div key={j} className="h-28 w-full bg-slate-900/30 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ))}
                </div>
            ) : (
                /* ── Kanban Board ────────────────────────── */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
                    <KanbanLane
                        title="New Orders"
                        icon="all"
                        orders={newOrders}
                        onAdvance={handleAdvance}
                        onCancel={handleCancel}
                        onViewOrder={setSelectedOrder}
                    />
                    <KanbanLane
                        title="Preparing"
                        icon="preparing"
                        orders={preparingOrders}
                        onAdvance={handleAdvance}
                        onCancel={handleCancel}
                        onViewOrder={setSelectedOrder}
                    />
                    <KanbanLane
                        title="Ready for Pickup"
                        icon="ready"
                        orders={readyOrders}
                        onAdvance={handleAdvance}
                        onCancel={handleCancel}
                        onViewOrder={setSelectedOrder}
                    />
                </div>
            )}

            {/* Order Details Dialog */}
            <OrderDetailsDialog
                open={!!selectedOrder}
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onUpdateStatus={async (orderId, newStatus) => {
                    if (newStatus === 'cancelled') {
                        await handleCancel(orderId);
                    } else {
                        await handleAdvance(orderId, newStatus);
                    }
                }}
            />
        </div>
    );
}
