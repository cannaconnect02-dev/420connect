import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { LayoutDashboard, Users, Settings, LogOut, Store } from 'lucide-react';

// Pages
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import DriverApprovals from './pages/DriverApprovals';
import NewStore from './pages/NewStore';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col">
        <div className="mb-10 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">A</div>
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <a href="/" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-slate-400">
            <LayoutDashboard size={20} /> Dashboard
          </a>
          <a href="/drivers" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-slate-400">
            <Users size={20} /> Driver Approvals
          </a>
          <a href="/stores/new" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-slate-400">
            <Store size={20} /> Onboard Store
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-slate-400">
            <Settings size={20} /> Settings
          </a>
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
      </Routes>
    </BrowserRouter>
  );
}
