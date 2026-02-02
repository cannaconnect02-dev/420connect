import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface Order {
    id: string;
    initials: string;
    name: string;
    items: number;
    total: string;
    status: "Ready" | "Preparing" | "New";
}

const statusStyles = {
    Ready: "bg-green-500/20 text-green-400",
    Preparing: "bg-amber-500/20 text-amber-400",
    New: "bg-sky-500/20 text-sky-400",
};

function OrderItem({ order }: { order: Order }) {
    return (
        <div className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-medium text-slate-400">
                    {order.initials}
                </div>
                <div>
                    <p className="font-medium text-white">{order.name}</p>
                    <p className="text-sm text-slate-400">
                        {order.items} items • {order.total}
                    </p>
                </div>
            </div>
            <span
                className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    statusStyles[order.status]
                )}
            >
                {order.status}
            </span>
        </div>
    );
}

export function RecentOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    async function fetchOrders() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setOrders([
                { id: "1", initials: "AF", name: "Alice Freeman", items: 3, total: "R450", status: "Ready" },
                { id: "2", initials: "BS", name: "Bob Smith", items: 1, total: "R120", status: "Preparing" },
                { id: "3", initials: "CD", name: "Charlie Davis", items: 2, total: "R650", status: "New" },
            ]);
            setLoading(false);
            return;
        }

        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('store_owner_id', user.id)
            .in('status', ['pending', 'new', 'preparing', 'ready'])
            .order('created_at', { ascending: false })
            .limit(5);

        if (data && data.length > 0) {
            const formattedOrders: Order[] = data.map(o => ({
                id: o.id,
                initials: o.id.slice(0, 2).toUpperCase(),
                name: `Customer ${o.id.slice(0, 3).toUpperCase()}`,
                items: Math.floor(Math.random() * 5) + 1,
                total: `R${o.total_amount}`,
                status: o.status === 'ready' ? 'Ready' : o.status === 'preparing' ? 'Preparing' : 'New',
            }));
            setOrders(formattedOrders);
        } else {
            setOrders([
                { id: "1", initials: "AF", name: "Alice Freeman", items: 3, total: "R450", status: "Ready" },
                { id: "2", initials: "BS", name: "Bob Smith", items: 1, total: "R120", status: "Preparing" },
                { id: "3", initials: "CD", name: "Charlie Davis", items: 2, total: "R650", status: "New" },
            ]);
        }
        setLoading(false);
    }

    return (
        <Card className="flex flex-col p-6 bg-slate-900 border-slate-800 h-full">
            <h3 className="mb-4 text-lg font-bold text-white">Live Orders</h3>
            <div className="flex-1 space-y-3">
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 animate-pulse">
                            <div className="h-10 w-10 rounded-full bg-slate-800" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-24 bg-slate-800 rounded" />
                                <div className="h-3 w-16 bg-slate-800 rounded" />
                            </div>
                        </div>
                    ))
                ) : (
                    orders.map((order) => (
                        <OrderItem key={order.id} order={order} />
                    ))
                )}
            </div>
            <Link to="/orders">
                <Button
                    variant="outline"
                    className="mt-4 w-full bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
                >
                    View All Orders
                </Button>
            </Link>
        </Card>
    );
}
