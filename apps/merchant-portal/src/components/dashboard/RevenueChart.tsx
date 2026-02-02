import { Card } from "@/components/ui/card";
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";

const data = [
    { day: "Mon", sales: 3200 },
    { day: "Tue", sales: 4100 },
    { day: "Wed", sales: 3800 },
    { day: "Thu", sales: 5200 },
    { day: "Fri", sales: 6800 },
    { day: "Sat", sales: 8200 },
    { day: "Sun", sales: 7500 },
];

export function RevenueChart() {
    return (
        <Card className="p-6 bg-slate-900 border-slate-800 h-full">
            <h3 className="mb-2 text-lg font-bold text-white">Weekly Sales</h3>
            <p className="mb-4 text-sm text-slate-400">Revenue performance over the last 7 days</p>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.5} />
                                <stop offset="100%" stopColor="#4ADE80" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#64748b", fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#64748b", fontSize: 12 }}
                            tickFormatter={(value) => `R${value}`}
                            width={50}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#151921",
                                border: "none",
                                borderRadius: "8px",
                                color: "#fff",
                            }}
                            formatter={(value: any) => [`R${Number(value).toLocaleString()}`, "Sales"]}
                            labelStyle={{ color: "#64748b" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="sales"
                            stroke="#4ADE80"
                            strokeWidth={2}
                            fill="url(#salesGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
