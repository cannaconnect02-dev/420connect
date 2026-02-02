import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ClipboardList,
    UtensilsCrossed,
    Users,
    LogOut,
    Leaf
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: ClipboardList, label: 'Orders', path: '/orders' },
    { icon: UtensilsCrossed, label: 'Menu', path: '/menu' },
    { icon: Users, label: 'Members', path: '/members' },
];

export default function Layout() {
    const location = useLocation();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Fixed Sidebar - admin-dashboard style */}
            <aside
                className="fixed inset-y-0 left-0 z-50 flex flex-col w-56 bg-slate-900 border-r border-slate-800"
            >
                {/* Logo */}
                <Link to="/settings" className="block hover:opacity-80 transition-opacity">
                    <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
                            <Leaf className="h-5 w-5 text-green-400" />
                        </div>
                        <span className="text-lg font-bold text-white">420Connect</span>
                    </div>
                </Link>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4">
                    <ul className="space-y-1">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <li key={item.path}>
                                    <NavLink
                                        to={item.path}
                                        className={cn(
                                            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-green-500/10 text-green-400"
                                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {item.label}
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Sign Out */}
                <div className="px-3 py-4 border-t border-slate-800">
                    <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                    >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="min-h-screen p-8 ml-56">
                <Outlet />
            </main>
        </div>
    );
}
