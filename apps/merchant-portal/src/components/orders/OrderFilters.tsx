import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface OrderFiltersProps {
    currentStatus: string;
    onStatusChange: (status: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

const STATUS_FILTERS = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'delivered', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

export function OrderFilters({
    currentStatus,
    onStatusChange,
    searchQuery,
    onSearchChange
}: OrderFiltersProps) {
    return (
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8 bg-slate-900/40 backdrop-blur-xl p-2 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto px-2">
                {STATUS_FILTERS.map((s) => (
                    <Button
                        key={s.value}
                        variant={currentStatus === s.value ? "default" : "ghost"}
                        onClick={() => onStatusChange(s.value)}
                        className={cn(
                            "rounded-xl transition-all duration-300 font-medium text-sm px-4",
                            currentStatus === s.value
                                ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(0,200,83,0.3)] hover:bg-emerald-600"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                        size="sm"
                    >
                        {s.label}
                    </Button>
                ))}
            </div>

            <div className="relative w-full md:w-80 pr-2">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
                <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-11 h-10 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
            </div>
        </div>
    );
}

// Add cn import if missing, assuming it's available or use template literal
import { cn } from "@/lib/utils";
