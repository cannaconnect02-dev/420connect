import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, ShoppingBag, Users, Activity } from 'lucide-react';

const mockData = [
    { name: 'Mon', revenue: 4000, orders: 240 },
    { name: 'Tue', revenue: 3000, orders: 139 },
    { name: 'Wed', revenue: 2000, orders: 980 },
    { name: 'Thu', revenue: 2780, orders: 390 },
    { name: 'Fri', revenue: 1890, orders: 480 },
    { name: 'Sat', revenue: 2390, orders: 380 },
    { name: 'Sun', revenue: 3490, orders: 430 },
];

export default function Dashboard() {
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-white">System Overview</h1>
                <p className="text-slate-400">Real-time platform metrics</p>
            </header>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card title="Total Revenue" value="R45,231.89" change="+20.1%" icon={<DollarSign size={20} />} active />
                <Card title="Active Orders" value="+573" change="+12.5%" icon={<ShoppingBag size={20} />} />
                <Card title="Total Users" value="12,345" change="+3.2%" icon={<Users size={20} />} />
                <Card title="System Health" value="99.9%" change="Optimal" icon={<Activity size={20} />} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-lg font-bold text-white mb-6">Revenue Trends</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mockData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-lg font-bold text-white mb-6">Order Volume</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mockData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Card({ title, value, change, icon, active }: any) {
    return (
        <div className={`p-6 rounded-2xl border border-slate-800 ${active ? 'bg-blue-600 border-blue-500' : 'bg-slate-900'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${active ? 'bg-white/20' : 'bg-slate-800'}`}>
                    {icon}
                </div>
                <span className={`text-sm font-medium ${active ? 'text-blue-200' : 'text-slate-500'}`}>{change}</span>
            </div>
            <h3 className={`text-2xl font-bold ${active ? 'text-white' : 'text-white'} mb-1`}>{value}</h3>
            <p className={`${active ? 'text-blue-100' : 'text-slate-400'} text-sm`}>{title}</p>
        </div>
    )
}
