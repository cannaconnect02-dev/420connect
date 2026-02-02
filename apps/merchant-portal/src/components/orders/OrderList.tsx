import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// This should match your Supabase type + any joined fields
export interface Order {
    id: string;
    customer_id: string;
    status: string;
    total_amount: number;
    created_at: string;
    items_count?: number;
    customer_name?: string;
}

interface OrderListProps {
    orders: Order[];
    loading: boolean;
    onViewOrder: (order: Order) => void;
    onUpdateStatus?: (orderId: string, newStatus: string) => void;
}

export function OrderList({ orders, loading, onViewOrder, onUpdateStatus }: OrderListProps) {
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'confirmed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'preparing': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'ready_for_pickup': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'ready': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'delivered': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-slate-500/10 text-slate-500';
        }
    };

    const canAcceptReject = (status: string) =>
        ['new', 'pending'].includes(status.toLowerCase());

    const isPreparing = (status: string) =>
        status.toLowerCase() === 'preparing';

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 w-full bg-slate-900/50 rounded-xl animate-pulse border border-white/5" />
                ))}
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-2xl border border-white/5 border-dashed">
                <div className="bg-slate-900 p-4 rounded-full mb-4">
                    <Clock className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-xl font-semibold text-white">No orders found</h3>
                <p className="text-slate-400 mt-1">Try adjusting your filters or wait for new orders.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Table className="border-separate border-spacing-y-3">
                <TableHeader className="bg-transparent">
                    <TableRow className="border-none hover:bg-transparent">
                        <TableHead className="text-slate-500 font-medium tracking-wider uppercase text-xs pl-6">Order ID</TableHead>
                        <TableHead className="text-slate-500 font-medium tracking-wider uppercase text-xs">Customer</TableHead>
                        <TableHead className="text-slate-500 font-medium tracking-wider uppercase text-xs">Date</TableHead>
                        <TableHead className="text-slate-500 font-medium tracking-wider uppercase text-xs">Total</TableHead>
                        <TableHead className="text-slate-500 font-medium tracking-wider uppercase text-xs">Status</TableHead>
                        <TableHead className="text-right text-slate-500 font-medium tracking-wider uppercase text-xs pr-6">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((order) => (
                        <TableRow
                            key={order.id}
                            className="bg-slate-900/60 backdrop-blur-md border border-white/5 hover:bg-slate-800/80 hover:scale-[1.01] hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)] transition-all duration-200 cursor-pointer group rounded-2xl shadow-sm"
                            style={{ borderRadius: '16px' }}
                        >
                            <TableCell className="font-medium text-white pl-6 py-4 rounded-l-xl" onClick={() => onViewOrder(order)}>
                                <span className="text-slate-600 mr-1">#</span>
                                <span className="font-mono text-emerald-400/80 group-hover:text-emerald-400 transition-colors">
                                    {order.id.slice(0, 8)}
                                </span>
                            </TableCell>
                            <TableCell className="py-4" onClick={() => onViewOrder(order)}>
                                <div className="flex flex-col">
                                    <span className="text-white font-semibold text-sm group-hover:text-emerald-100 transition-colors">
                                        {order.customer_name || 'Guest User'}
                                    </span>
                                    <span className="text-xs text-slate-500">{order.items_count || 1} items</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-slate-400 text-sm py-4" onClick={() => onViewOrder(order)}>
                                {new Date(order.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-white font-bold text-base py-4" onClick={() => onViewOrder(order)}>
                                R{order.total_amount?.toFixed(2)}
                            </TableCell>
                            <TableCell className="py-4" onClick={() => onViewOrder(order)}>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "rounded-full px-3 py-1 font-medium border uppercase text-[10px] tracking-wide shadow-[0_0_10px_rgba(0,0,0,0.1)]",
                                        getStatusColor(order.status)
                                    )}
                                >
                                    {order.status.replace('_', ' ')}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6 py-4 rounded-r-xl">
                                {canAcceptReject(order.status) && onUpdateStatus ? (
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateStatus(order.id, 'cancelled');
                                            }}
                                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        >
                                            <X size={16} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateStatus(order.id, 'preparing');
                                            }}
                                            className="h-8 px-3 bg-green-500 hover:bg-green-600 text-white"
                                        >
                                            <Check size={16} className="mr-1" />
                                            Accept
                                        </Button>
                                    </div>
                                ) : isPreparing(order.status) && onUpdateStatus ? (
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateStatus(order.id, 'cancelled');
                                            }}
                                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        >
                                            <X size={16} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateStatus(order.id, 'ready');
                                            }}
                                            className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white"
                                        >
                                            <Check size={16} className="mr-1" />
                                            Mark Ready
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => onViewOrder(order)}
                                        className="h-8 w-8 text-slate-500 hover:text-white hover:bg-emerald-500/20 rounded-full transition-colors"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
