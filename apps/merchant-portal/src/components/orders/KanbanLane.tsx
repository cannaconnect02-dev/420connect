import { cn } from '@/lib/utils';
import { type Order } from './OrderList';
import { OrderKanbanCard } from './OrderKanbanCard';
import { Clock, ChefHat, PackageCheck, Inbox } from 'lucide-react';

interface KanbanLaneProps {
    title: string;
    icon: 'all' | 'preparing' | 'ready';
    orders: Order[];
    onAdvance: (orderId: string, nextStatus: string) => void;
    onCancel: (orderId: string) => void;
    onViewOrder: (order: Order) => void;
}

const LANE_CONFIG = {
    all: {
        icon: Inbox,
        gradient: 'from-slate-500/20 to-slate-600/10',
        badgeColor: 'bg-slate-500 text-white',
        borderColor: 'border-slate-500/30',
    },
    preparing: {
        icon: ChefHat,
        gradient: 'from-amber-500/20 to-orange-600/10',
        badgeColor: 'bg-amber-500 text-white',
        borderColor: 'border-amber-500/30',
    },
    ready: {
        icon: PackageCheck,
        gradient: 'from-emerald-500/20 to-green-600/10',
        badgeColor: 'bg-emerald-500 text-white',
        borderColor: 'border-emerald-500/30',
    },
};

export function KanbanLane({ title, icon, orders, onAdvance, onCancel, onViewOrder }: KanbanLaneProps) {
    const config = LANE_CONFIG[icon];
    const Icon = config.icon;

    return (
        <div className={cn(
            'flex flex-col min-h-0 rounded-2xl border bg-slate-950/40 backdrop-blur-sm overflow-hidden',
            config.borderColor
        )}>
            {/* Lane Header */}
            <div className={cn(
                'flex items-center justify-between px-5 py-4 bg-gradient-to-r border-b',
                config.gradient,
                config.borderColor
            )}>
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-white/5">
                        <Icon className="h-5 w-5 text-white/80" />
                    </div>
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                        {title}
                    </h3>
                </div>
                <span className={cn(
                    'inline-flex items-center justify-center min-w-[32px] h-8 px-3 rounded-full text-sm font-bold shadow-lg',
                    config.badgeColor
                )}>
                    {orders.length}
                </span>
            </div>

            {/* Lane Body — Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[calc(100vh-240px)]">
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-3 rounded-full bg-white/5 mb-3">
                            <Clock className="h-6 w-6 text-slate-600" />
                        </div>
                        <p className="text-sm text-slate-600 font-medium">No orders</p>
                        <p className="text-xs text-slate-700 mt-1">Orders will appear here</p>
                    </div>
                ) : (
                    orders.map(order => (
                        <OrderKanbanCard
                            key={order.id}
                            order={order}
                            lane={icon}
                            onAdvance={onAdvance}
                            onCancel={onCancel}
                            onViewOrder={onViewOrder}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
