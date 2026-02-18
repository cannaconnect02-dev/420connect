import { LayoutDashboard, ShoppingBag, Menu as MenuIcon, LogOut, Settings } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path: string) => location.pathname === path;

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/auth');
    };

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/orders', icon: ShoppingBag, label: 'Orders' },
        { path: '/menu', icon: MenuIcon, label: 'Menu' },
        { path: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <aside className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col h-screen fixed left-0 top-0">
            {/* Logo Area */}
            <div className="p-6 border-b border-slate-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400">
                    <LayoutDashboard size={20} />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">420Connect</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map(({ path, icon: Icon, label }) => (
                    <Link
                        key={path}
                        to={path}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
                            isActive(path)
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Icon size={20} />
                        {label}
                    </Link>
                ))}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-slate-900">
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium text-left"
                >
                    <LogOut size={20} />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
