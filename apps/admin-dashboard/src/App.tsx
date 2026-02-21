import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { LayoutDashboard, Users, Settings as SettingsIcon, LogOut, Store, PlusCircle } from 'lucide-react';

// Pages
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import DriverApprovals from './pages/DriverApprovals';
import NewStore from './pages/NewStore';
import StoreApprovals from './pages/StoreApprovals';
import Stores from './pages/Stores';
import Settings from './pages/Settings';
import { Link, useLocation } from 'react-router-dom';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
  if (!session) return <Navigate to="/auth" />;

  const isActive = (path: string) => location.pathname === path ? "bg-green-500/10 text-green-400" : "hover:bg-white/5 text-slate-400";

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col">
        <div className="mb-10 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">A</div>
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/')}`}>
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link to="/stores" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/stores')}`}>
            <Store size={20} /> Active Stores
          </Link>
          <Link to="/stores/approvals" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/stores/approvals')}`}>
            <Store size={20} /> Store Approvals
          </Link>
          <Link to="/drivers" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/drivers')}`}>
            <Users size={20} /> Driver Approvals
          </Link>
          <Link to="/stores/new" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/stores/new')}`}>
            <PlusCircle size={20} /> Onboard Store
          </Link>
          <div className="border-t border-slate-800 my-4 pt-4">
            <Link to="/settings" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/settings')}`}>
              <SettingsIcon size={20} /> Settings
            </Link>
          </div>
        </nav>

        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl transition-colors margin-top-auto"
        >
          <LogOut size={20} /> Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        } />
        <Route path="/stores" element={
          <ProtectedLayout>
            <Stores />
          </ProtectedLayout>
        } />
        <Route path="/stores/approvals" element={
          <ProtectedLayout>
            <StoreApprovals />
          </ProtectedLayout>
        } />
        <Route path="/drivers" element={
          <ProtectedLayout>
            <DriverApprovals />
          </ProtectedLayout>
        } />
        <Route path="/stores/new" element={
          <ProtectedLayout>
            <NewStore />
          </ProtectedLayout>
        } />
        <Route path="/settings" element={
          <ProtectedLayout>
            <Settings />
          </ProtectedLayout>
        } />
      </Routes>
    </BrowserRouter>
  );
}
