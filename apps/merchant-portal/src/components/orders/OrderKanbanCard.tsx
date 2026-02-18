import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, X, Clock, Package, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Order } from './OrderList';

interface OrderKanbanCardProps {
    order: Order;
    lane: 'all' | 'preparing' | 'ready';
    onAdvance: (orderId: string, nextStatus: string) => void;
    onCancel: (orderId: string) => void;
    onViewOrder: (order: Order) => void;
}

const NEXT_STATUS: Record<string, { label: string; next: string; color: string }> = {
    pending: { label: 'Start Preparing', next: 'preparing', color: 'bg-amber-500 hover:bg-amber-600' },
    preparing: { label: 'Mark Ready', next: 'ready_for_pickup', color: 'bg-emerald-500 hover:bg-emerald-600' },
    ready_for_pickup: { label: 'Picked Up', next: 'picked_up', color: 'bg-blue-500 hover:bg-blue-600' },
};

function useElapsedTime(createdAt: string) {
    const [elapsed, setElapsed] = useState('');

    useEffect(() => {
        function update() {
            const diff = Date.now() - new Date(createdAt).getTime();
            const mins = Math.floor(diff / 60000);
            const hrs = Math.floor(mins / 60);
            if (hrs > 0) {
                setElapsed(`${hrs}h ${mins % 60}m`);
            } else {
                setElapsed(`${mins}m`);
            }
        }
        update();
        const interval = setInterval(update, 30000); // update every 30s
        return () => clearInterval(interval);
    }, [createdAt]);

    return elapsed;
}

export function OrderKanbanCard({ order, lane, onAdvance, onCancel, onViewOrder }: OrderKanbanCardProps) {
    const elapsed = useElapsedTime(order.created_at);
    const isCancelled = order.status === 'cancelled';
    const isTerminal = isCancelled || order.status === 'delivered' || order.status === 'picked_up';
    const nextAction = NEXT_STATUS[order.status];

    // Urgency coloring based on time
    const diffMins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
    const urgencyBorder = diffMins > 30
        ? 'border-l-red-500'
        : diffMins > 15
            ? 'border-l-amber-500'
            : 'border-l-emerald-500';

    return (
        <div
            className={cn(
                'group relative bg-slate-900/70 backdrop-blur-md rounded-xl border border-white/5 p-4 transition-all duration-200 border-l-4 cursor-pointer',
                urgencyBorder,
                isCancelled && 'opacity-60',
                !isTerminal && 'hover:bg-slate-800/80 hover:shadow-lg hover:shadow-black/20 hover:scale-[1.01]',
            )}
            onClick={() => onViewOrder(order)}
        >
            {/* Header Row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs">#</span>
                    <span className={cn(
                        'font-mono text-sm font-semibold',
                        isCancelled ? 'text-red-400 line-through' : 'text-emerald-400'
                    )}>
                        {order.id.slice(0, 8).toUpperCase()}
                    </span>
                </div>
                {isCancelled && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px] uppercase tracking-wider">
                        Cancelled
                    </Badge>
                )}
            </div>

            {/* Customer & Items */}
            <div className="flex items-center gap-2 mb-2">
                <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span className={cn(
                    'text-sm font-medium truncate',
                    isCancelled ? 'text-slate-500 line-through' : 'text-white'
                )}>
                    {order.customer_name || 'Guest'}
                </span>
            </div>

            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs text-slate-400">{order.items_count || 1} items</span>
                </div>
                <span className="text-sm font-bold text-white">
                    R{order.total_amount?.toFixed(2)}
                </span>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-1.5 mb-3">
                <Clock className={cn(
                    'h-3 w-3',
                    diffMins > 30 ? 'text-red-400' : diffMins > 15 ? 'text-amber-400' : 'text-slate-500'
                )} />
                <span className={cn(
                    'text-xs font-medium',
                    diffMins > 30 ? 'text-red-400' : diffMins > 15 ? 'text-amber-400' : 'text-slate-500'
                )}>
                    {elapsed} ago
                </span>
            </div>

            {/* Actions */}
            {!isTerminal && lane !== 'all' && nextAction && (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onAdvance(order.id, nextAction.next); }}
                        className={cn('flex-1 h-8 text-xs font-semibold text-white shadow-md', nextAction.color)}
                    >
                        {nextAction.label}
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); onCancel(order.id); }}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* All Orders lane: show advance for pending orders */}
            {!isTerminal && lane === 'all' && order.status === 'pending' && nextAction && (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onAdvance(order.id, nextAction.next); }}
                        className={cn('flex-1 h-8 text-xs font-semibold text-white shadow-md', nextAction.color)}
                    >
                        {nextAction.label}
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); onCancel(order.id); }}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
