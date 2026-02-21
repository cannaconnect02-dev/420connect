import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Order } from "./OrderList";
import { Clock, User, CheckCircle2, ChevronRight, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface OrderDetailsDialogProps {
    open: boolean;
    order: Order | null;
    onClose: () => void;
    onUpdateStatus: (orderId: string, newStatus: string) => Promise<void>;
}

interface OrderItem {
    id: string;
    quantity: number;
    price_at_time: number;
    menu_item_id: string;
    menu_items?: {
        name: string;
        description?: string;
        image_url?: string;
    };
}

export function OrderDetailsDialog({ open, order, onClose, onUpdateStatus }: OrderDetailsDialogProps) {
    const [updating, setUpdating] = useState(false);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    // Fetch real order items when dialog opens
    useEffect(() => {
        if (!order || !open) {
            setItems([]);
            return;
        }

        async function fetchItems() {
            setLoadingItems(true);
            const { data, error } = await supabase
                .from('order_items')
                .select('id, quantity, price_at_time, menu_item_id, menu_items(name, description, image_url)')
                .eq('order_id', order!.id);

            if (error) {
                console.error('Error fetching order items:', error);
            } else {
                setItems((data as any[]) || []);
            }
            setLoadingItems(false);
        }

        fetchItems();
    }, [order?.id, open]);

    if (!order) return null;

    const total = items.reduce((acc, item) => acc + (item.price_at_time * item.quantity), 0);
    const displayTotal = total > 0 ? total : order.total_amount;

    // Status Workflow Logic
    const getNextStatus = (current: string) => {
        switch (current) {
            case 'new':
            case 'confirmed':
            case 'pending':
            case 'paid':
            case 'processing':
            case 'accepted': return { label: 'Accept Order', next: 'preparing', color: 'bg-amber-500 hover:bg-amber-600' };
            case 'preparing': return { label: 'Mark Ready', next: 'ready_for_pickup', color: 'bg-emerald-500 hover:bg-emerald-600' };
            case 'ready_for_pickup': return { label: 'Picked Up', next: 'picked_up', color: 'bg-blue-600 hover:bg-blue-700' };
            default: return null;
        }
    };

    const nextAction = getNextStatus(order.status);

    const handleAction = async () => {
        if (!nextAction) return;
        setUpdating(true);
        await onUpdateStatus(order.id, nextAction.next);
        setUpdating(false);
        onClose();
    };

    const handleCancel = async () => {
        setUpdating(true);
        await onUpdateStatus(order.id, 'cancelled');
        setUpdating(false);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="bg-slate-950/90 backdrop-blur-xl border-white/10 text-white sm:max-w-[600px] p-0 overflow-hidden shadow-2xl">
                <div className="bg-slate-900/50 p-6 border-b border-white/5">
                    <DialogHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                                    <span>#{order.id.slice(0, 8)}</span>
                                    <Badge variant="outline" className="text-xs uppercase font-normal tracking-wider bg-white/5 border-white/10">{order.status.replace('_', ' ')}</Badge>
                                </DialogTitle>
                                <DialogDescription className="text-slate-400 mt-1 flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    Placed on {new Date(order.created_at).toLocaleString()}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    {/* Customer Info */}
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center">
                            <User className="text-slate-400 w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Customer</p>
                            <p className="font-semibold text-white">{order.customer_name || 'Guest Customer'}</p>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Order Items</h4>
                        {loadingItems ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                                <span className="ml-2 text-sm text-slate-500">Loading items...</span>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-6 text-slate-500 text-sm">
                                No items found for this order
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded-lg -mx-2 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-slate-800/50 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 text-xs font-mono">
                                                x{item.quantity}
                                            </div>
                                            <span className="text-slate-200">
                                                {item.menu_items?.name || 'Unknown Item'}
                                            </span>
                                        </div>
                                        <span className="text-white font-medium">
                                            R{(item.price_at_time * item.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="pt-4 flex justify-between items-center border-t border-white/10 mt-4">
                            <span className="text-slate-400">Total Amount</span>
                            <span className="text-2xl font-bold text-emerald-400">R{displayTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="bg-slate-900/50 p-6 border-t border-white/5 flex gap-3 sm:justify-between">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={updating || order.status === 'cancelled' || order.status === 'delivered' || order.status === 'picked_up'}
                        className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                    >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Order
                    </Button>

                    {nextAction ? (
                        <Button
                            onClick={handleAction}
                            disabled={updating}
                            className={cn("text-white shadow-lg transition-all", nextAction.color)}
                        >
                            {updating ? 'Updating...' : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    {nextAction.label}
                                    <ChevronRight className="w-4 h-4 ml-1 opacity-70" />
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button disabled variant="secondary" className="bg-slate-800 text-slate-500">
                            No Actions Available
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
