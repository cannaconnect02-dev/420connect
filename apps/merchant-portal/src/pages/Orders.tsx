import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KanbanLane } from '@/components/orders/KanbanLane';
import { type Order } from '@/components/orders/OrderList';
import { OrderDetailsDialog } from '@/components/orders/OrderDetailsDialog';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface CancellationReason {
    id: string;
    reason_text: string;
}

export default function Orders() {
    const { toast } = useToast();
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD
    });

    // Cancellation Modal State
    const [cancellationReasons, setCancellationReasons] = useState<CancellationReason[]>([]);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
    const [selectedReasonId, setSelectedReasonId] = useState<string>('');
    const [isCancelling, setIsCancelling] = useState(false);

    // ─── Fetch store ID & Reasons on mount ─────────────────────────────
    useEffect(() => {
        async function getStore() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }
                const { data: store, error } = await supabase
                    .from('stores')
                    .select('id')
                    .eq('owner_id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error('Error fetching store:', error);
                    toast({
                        title: "Store Fetch Error",
                        description: error.message,
                        variant: "destructive",
                    });
                    setLoading(false);
                    return;
                }

                if (store) {
                    console.log('Store ID fetched:', store.id);
                    setStoreId(store.id);
                } else {
                    console.warn('No store found for this user');
                    setLoading(false);
                }
            } catch (err: any) {
                console.error('Unexpected error in getStore:', err);
                setLoading(false);
            }
        }

        async function fetchCancellationReasons() {
            try {
                const { data, error } = await supabase
                    .from('cancellation_reasons')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: true });
                if (!error && data) {
                    setCancellationReasons(data);
                }
            } catch (err) {
                console.error('Failed to fetch cancellation reasons:', err);
            }
        }

        getStore();
        fetchCancellationReasons();
    }, [toast]);

    // ─── Fetch orders for selected date ──────────────────────
    const fetchOrders = useCallback(async () => {
        if (!storeId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        console.log(`Fetching orders for store ${storeId} on ${selectedDate}`);

        const dayStart = `${selectedDate}T00:00:00.000Z`;
        const dayEnd = `${selectedDate}T23:59:59.999Z`;

        console.log(`[Diagnostic] Querying store: ${storeId}`);
        console.log(`[Diagnostic] Querying date range: ${dayStart} to ${dayEnd}`);
        console.log(`[Diagnostic] Current Browser Time: ${new Date().toISOString()}`);

        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(id, quantity)')
                .eq('store_id', storeId)
                .gte('created_at', dayStart)
                .lte('created_at', dayEnd)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching orders:', error);
                toast({
                    title: "Fetch Orders Failed",
                    description: error.message,
                    variant: "destructive",
                });
            } else if (data) {
                console.log(`Fetched ${data.length} orders total`);
                // Filter out cancelled orders immediately
                const active = data.filter((o: any) => o.status !== 'cancelled');
                const enriched = active.map((o: any) => ({
                    ...o,
                    customer_name: o.customer_name || `Customer ${o.id.slice(0, 3).toUpperCase()}`,
                    items_count: Array.isArray(o.order_items)
                        ? o.order_items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
                        : 0,
                }));
                setAllOrders(enriched);
                setLastSync(new Date());
            }
        } catch (err: any) {
            console.error('Unexpected error in fetchOrders:', err);
        } finally {
            setLoading(false);
        }
    }, [storeId, selectedDate]); // Removed toast from dependencies

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // ─── Real-time subscription ──────────────────────────────

    // Helper to fetch and inject a single order that was missed locally
    const fetchMissingOrder = async (orderId: string) => {
        try {
            const { data: fullOrder, error } = await supabase
                .from('orders')
                .select('*, order_items(id, quantity)')
                .eq('id', orderId)
                .single();

            if (error || !fullOrder || fullOrder.status === 'cancelled') return;

            // Check if it's for today's selected date
            const orderDate = new Date(fullOrder.created_at).toISOString().split('T')[0];
            if (orderDate !== selectedDate) return;

            setAllOrders(prev => {
                if (prev.some(o => o.id === fullOrder.id)) return prev; // Avoid race condition duplicates

                const enriched = {
                    ...fullOrder,
                    customer_name: fullOrder.customer_name || `Customer ${fullOrder.id.slice(0, 3).toUpperCase()}`,
                    items_count: Array.isArray(fullOrder.order_items)
                        ? fullOrder.order_items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
                        : 0,
                };
                return [enriched, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            });
        } catch (err) {
            console.error('Failed to fetch missing order:', err);
        }
    };

    useEffect(() => {
        if (!storeId) return;

        console.log(`Subscribing to orders for store: ${storeId}`);
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
                async (payload) => {
                    console.log('Realtime event received in Orders page:', payload);

                    if (payload.eventType === 'INSERT') {
                        const newOrderRaw = payload.new as Order;
                        if (newOrderRaw.status === 'cancelled') return;

                        const orderDate = new Date(newOrderRaw.created_at).toISOString().split('T')[0];
                        if (orderDate === selectedDate) {
                            const { data: fullOrder } = await supabase
                                .from('orders')
                                .select('*, order_items(id, quantity)')
                                .eq('id', newOrderRaw.id)
                                .single();

                            if (fullOrder && fullOrder.status !== 'cancelled') {
                                setAllOrders(prev => {
                                    if (prev.some(o => o.id === fullOrder.id)) return prev;
                                    const enriched = {
                                        ...fullOrder,
                                        customer_name: fullOrder.customer_name || `Customer ${fullOrder.id.slice(0, 3).toUpperCase()}`,
                                        items_count: Array.isArray(fullOrder.order_items)
                                            ? fullOrder.order_items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
                                            : 0,
                                    };
                                    return [enriched, ...prev];
                                });
                                setLastSync(new Date());
                            }
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as Order;
                        console.log(`Order updated: ${updated.id}, New Status: ${updated.status}`);

                        // Fetch the current items in case we don't have this order at all (e.g. initial insert was discarded because it was "unpaid pending").
                        setAllOrders(prev => {
                            if (updated.status === 'cancelled') {
                                return prev.filter(o => o.id !== updated.id);
                            }

                            const exists = prev.some(o => o.id === updated.id);

                            if (exists) {
                                // Standard update for existing order
                                return prev.map(o => o.id === updated.id ? { ...o, ...updated } : o);
                            } else {
                                // Order doesn't exist locally. Wait, is it now a valid active order? Let's check!
                                // The newOrders filter in the component requires it to be pending/new/etc and paid (or at least not failed/null if pending).
                                const isValidActive = ['pending', 'new', 'confirmed', 'paid', 'processing', 'accepted'].includes(updated.status);
                                const isUnpaidPending = updated.status === 'pending' && (!updated.paystack_payment_status || updated.paystack_payment_status === 'failed');

                                if (isValidActive && !isUnpaidPending) {
                                    console.log(`Order ${updated.id} is now valid but missing locally. Fetching full details to inject...`);
                                    // We must do an async fetch for full details (with order_items). 
                                    // Since we are inside a state setter, we can't do async await natively here.
                                    // We trigger an external fetch and return prev unchanged for now.
                                    fetchMissingOrder(updated.id);
                                }
                                return prev;
                            }
                        });

                        setLastSync(new Date());
                    } else if (payload.eventType === 'DELETE') {
                        const deleted = payload.old as { id: string };
                        setAllOrders(prev => prev.filter(o => o.id !== deleted.id));
                        setLastSync(new Date());
                    }
                }
            )
            .subscribe((status, err) => {
                console.log(`Subscription status for store ${storeId}:`, status, err);
            });

        return () => {
            console.log('Unsubscribing from orders');
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
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive",
            });
            fetchOrders(); // revert on failure
        } else {
            toast({
                title: "Order Updated",
                description: `Order successfully moved to ${nextStatus.replace('_', ' ')}`,
            });
            setLastSync(new Date());
        }
    }

    // ─── Cancellation sequence ───────────────────────────────
    function promptCancel(orderId: string) {
        setOrderToCancel(orderId);
        setSelectedReasonId('');
        setCancelModalVisible(true);
    }

    async function executeCancel() {
        if (!orderToCancel || !selectedReasonId) {
            toast({
                title: "Reason Required",
                description: "Please select a cancellation reason.",
                variant: "destructive",
            });
            return;
        }

        setIsCancelling(true);
        console.log(`[Orders] Merchant initiated cancellation for ${orderToCancel} with reason ID ${selectedReasonId}`);

        // Find reason text to store as fallback
        const reasonText = cancellationReasons.find(r => r.id === selectedReasonId)?.reason_text || null;

        // Optimistic update
        setAllOrders(prev => prev.filter(o => o.id !== orderToCancel));
        setCancelModalVisible(false); // Hide model while processing

        // 1. Update status in database
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: 'cancelled',
                cancelled_by: 'merchant',
                cancellation_reason_id: selectedReasonId,
                cancellation_reason: reasonText,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderToCancel);

        if (updateError) {
            console.error(`[Orders] Failed to update DB for cancellation of ${orderToCancel}:`, updateError);
            toast({
                title: "Cancellation Failed",
                description: updateError.message,
                variant: "destructive",
            });
            fetchOrders(); // Revert by fetching fresh data
            setIsCancelling(false);
            setOrderToCancel(null);
            return;
        }

        console.log(`[Orders] DB update successful for ${orderToCancel}`);
        toast({
            title: "Order Cancelled",
            description: "The order has been removed from the queue and a refund has been initiated.",
        });
        setLastSync(new Date());

        // 2. Fetch fresh order data to ensure we have the most up-to-date paystack info
        const { data: freshOrder, error: fetchError } = await supabase
            .from('orders')
            .select('paystack_reference, paystack_payment_status, id')
            .eq('id', orderToCancel)
            .single();

        if (fetchError || !freshOrder) {
            console.error('Failed to fetch fresh order data for refund check:', fetchError);
            return;
        }

        // 3. Trigger refund if applicable
        if (freshOrder.paystack_reference && (freshOrder.paystack_payment_status === 'charged' || freshOrder.paystack_payment_status === 'success')) {
            console.log(`Triggering refund for order ${orderToCancel} (Ref: ${freshOrder.paystack_reference})`);

            try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                const res = await fetch(`${supabaseUrl}/functions/v1/paystack-refund`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseAnonKey}`
                    },
                    body: JSON.stringify({
                        reference: freshOrder.paystack_reference,
                        cancelled_by: 'merchant'
                    })
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    console.error('Refund trigger failed:', data);
                } else {
                    console.log('Refund trigger success:', data);
                }
            } catch (refundError) {
                console.error('Refund trigger exception:', refundError);
            } finally {
                setIsCancelling(false);
                setOrderToCancel(null);
                setSelectedReasonId('');
            }
        }
        else {
            console.log(`No refund needed for order ${orderToCancel} (Status: ${freshOrder.paystack_payment_status}, Ref: ${freshOrder.paystack_reference})`);
            setIsCancelling(false);
            setOrderToCancel(null);
            setSelectedReasonId('');
        }
    }

    // ─── Derived lane data ───────────────────────────────────
    const newOrders = allOrders.filter(o => {
        if (!['pending', 'new', 'confirmed', 'paid', 'processing', 'accepted'].includes(o.status)) return false;
        // Hide unpaid pending orders from the merchant queue
        if (o.status === 'pending' && (!o.paystack_payment_status || o.paystack_payment_status === 'failed')) return false;
        return true;
    });
    const preparingOrders = allOrders.filter(o => o.status === 'preparing');
    const readyOrders = allOrders.filter(o => o.status === 'ready_for_pickup' || o.status === 'ready');

    // Global stats
    const totalActive = allOrders.filter(o => {
        if (['cancelled', 'delivered', 'picked_up'].includes(o.status)) return false;
        // Hide unpaid pending orders from active stats
        if (o.status === 'pending' && (!o.paystack_payment_status || o.paystack_payment_status === 'failed')) return false;
        return true;
    }).length;

    return (
        <div className="h-full flex flex-col p-6 max-w-[1600px] mx-auto">
            {/* ── Header ───────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Order Queue
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-slate-400 text-sm">
                            {totalActive} active order{totalActive !== 1 ? 's' : ''} today
                        </p>
                        {lastSync && (
                            <>
                                <span className="text-slate-700">•</span>
                                <p className="text-slate-500 text-[10px] uppercase tracking-widest font-medium">
                                    Last Sync: {lastSync.toLocaleTimeString()}
                                </p>
                            </>
                        )}
                        {storeId && (
                            <>
                                <span className="text-slate-700">•</span>
                                <p className="text-slate-600 text-[10px] font-mono">
                                    Store: {storeId.slice(0, 8)}
                                </p>
                            </>
                        )}
                    </div>
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
                        onCancel={promptCancel}
                        onViewOrder={setSelectedOrder}
                    />
                    <KanbanLane
                        title="Preparing"
                        icon="preparing"
                        orders={preparingOrders}
                        onAdvance={handleAdvance}
                        onCancel={promptCancel}
                        onViewOrder={setSelectedOrder}
                    />
                    <KanbanLane
                        title="Ready for Pickup"
                        icon="ready"
                        orders={readyOrders}
                        onAdvance={handleAdvance}
                        onCancel={promptCancel}
                        onViewOrder={setSelectedOrder}
                    />
                </div>
            )}

            <OrderDetailsDialog
                open={!!selectedOrder}
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onUpdateStatus={async (orderId, newStatus) => {
                    if (newStatus === 'cancelled') {
                        promptCancel(orderId);
                        setSelectedOrder(null); // Close details dialog so cancel dialog can take over
                    } else {
                        await handleAdvance(orderId, newStatus);
                    }
                }}
            />

            {/* Cancellation Reason Dialog */}
            <Dialog open={cancelModalVisible} onOpenChange={setCancelModalVisible}>
                <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Cancel Order</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Please select a reason for cancelling this order. This action cannot be undone and will initiate a customer refund.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Select value={selectedReasonId} onValueChange={setSelectedReasonId}>
                            <SelectTrigger className="w-full bg-slate-950 border-white/10">
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                {cancellationReasons.map((reason) => (
                                    <SelectItem key={reason.id} value={reason.id} className="focus:bg-slate-800 focus:text-white cursor-pointer">
                                        {reason.reason_text}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCancelModalVisible(false);
                                setOrderToCancel(null);
                            }}
                            className="bg-transparent border-white/10 text-white hover:bg-white/5 disabled:opacity-50"
                            disabled={isCancelling}
                        >
                            Back
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={executeCancel}
                            disabled={!selectedReasonId || isCancelling}
                            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                        >
                            {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
