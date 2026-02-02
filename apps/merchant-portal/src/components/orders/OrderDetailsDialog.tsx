import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Order } from "./OrderList";
import { Clock, User, CheckCircle2, ChevronRight, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface OrderDetailsDialogProps {
    open: boolean;
    order: Order | null;
    onClose: () => void;
    onUpdateStatus: (orderId: string, newStatus: string) => Promise<void>;
}

// Mock items generator if not present in order object yet
const getMockItems = (_orderId: string) => [
    { id: '1', name: 'Premium Cannabis Oil', quantity: 2, price: 450.00 },
    { id: '2', name: 'Rolling Papers (Pack)', quantity: 1, price: 25.00 },
    { id: '3', name: 'Herbal Grinder', quantity: 1, price: 150.00 },
];

export function OrderDetailsDialog({ open, order, onClose, onUpdateStatus }: OrderDetailsDialogProps) {
    const [updating, setUpdating] = useState(false);

    if (!order) return null;

    const items = getMockItems(order.id); // In real app, this would be fetched or passed in
    const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Status Workflow Logic
    const getNextStatus = (current: string) => {
        switch (current) {
            case 'pending': return { label: 'Accept Order', next: 'preparing', color: 'bg-amber-500 hover:bg-amber-600' };
            case 'preparing': return { label: 'Mark Ready', next: 'ready', color: 'bg-emerald-500 hover:bg-emerald-600' };
            case 'ready_for_pickup': return { label: 'Complete Order', next: 'delivered', color: 'bg-blue-600 hover:bg-blue-700' };
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
                                    <Badge variant="outline" className="text-xs uppercase font-normal tracking-wider bg-white/5 border-white/10">{order.status}</Badge>
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
                        <div className="space-y-2">
                            {items.map((item) => (
                                <div key={item.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded-lg -mx-2 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-800/50 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 text-xs font-mono">
                                            x{item.quantity}
                                        </div>
                                        <span className="text-slate-200">{item.name}</span>
                                    </div>
                                    <span className="text-white font-medium">R{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 flex justify-between items-center border-t border-white/10 mt-4">
                            <span className="text-slate-400">Total Amount</span>
                            <span className="text-2xl font-bold text-emerald-400">R{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="bg-slate-900/50 p-6 border-t border-white/5 flex gap-3 sm:justify-between">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={updating || order.status === 'cancelled' || order.status === 'delivered'}
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
