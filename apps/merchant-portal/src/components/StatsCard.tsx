import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    isPositive: boolean;
    icon: LucideIcon;
}

export function StatCard({ title, value, change, isPositive, icon: Icon }: StatCardProps) {
    return (
        <Card className="p-5 bg-card/50 border-0 backdrop-blur-sm">
            <div className="flex items-start justify-between">
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                        <span
                            className={cn(
                                "text-sm font-medium",
                                isPositive ? "text-primary" : "text-amber-500"
                            )}
                        >
                            {change}
                        </span>
                    </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/80 text-primary">
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </Card>
    );
}
