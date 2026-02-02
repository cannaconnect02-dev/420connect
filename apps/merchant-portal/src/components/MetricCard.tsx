import { Card } from "@/components/ui/card";
import { DollarSign, ClipboardCheck, Clock, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Icon mapping for metrics
const METRIC_ICONS: Record<string, LucideIcon> = {
    DollarSign,
    ClipboardCheck,
    Clock,
    TrendingUp,
};

// Color schemes for metric icons
const ICON_COLORS = {
    green: "bg-green-500/10 text-[#4ADE80]",
    blue: "bg-blue-500/20 text-blue-400",
    amber: "bg-amber-500/20 text-amber-400",
    purple: "bg-purple-500/20 text-purple-400",
    pink: "bg-pink-500/20 text-pink-400",
};

interface MetricCardProps {
    title: string;
    value: string;
    change?: string;
    isPositive?: boolean;
    iconName: keyof typeof METRIC_ICONS;
    iconColor?: keyof typeof ICON_COLORS;
}

export function MetricCard({
    title,
    value,
    change,
    isPositive = true,
    iconName,
    iconColor = "green",
}: MetricCardProps) {
    const Icon = METRIC_ICONS[iconName] || DollarSign;

    return (
        <Card className="p-6 bg-slate-900 border-slate-800">
            <div className="flex items-start justify-between gap-4">
                {/* Left: Title and Value */}
                <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-400 mb-2 truncate">
                        {title}
                    </p>
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="text-2xl font-bold text-white tabular-nums">
                            {value}
                        </p>
                        {change && (
                            <span
                                className={cn(
                                    "px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
                                    isPositive
                                        ? "bg-green-500/10 text-green-400"
                                        : "bg-amber-500/10 text-amber-400"
                                )}
                            >
                                {change}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right: Icon */}
                <div
                    className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        ICON_COLORS[iconColor]
                    )}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </Card>
    );
}

// Export icons for external use
export { METRIC_ICONS, ICON_COLORS };
