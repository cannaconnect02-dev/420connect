import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import Members from './pages/Members';
import Settings from './pages/Settings';
import Earnings from './pages/Earnings';
import Statements from './pages/Statements';
import ApplicationStatus from './pages/ApplicationStatus';
import Layout from '@/components/layout/Layout';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

function AppContent() {
  const { session, isLoading, applicationStatus } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" replace />} />

        <Route path="/application-status" element={
          session ? (
            applicationStatus === 'pending' || applicationStatus === 'rejected' ?
              <ApplicationStatus /> :
              <Navigate to="/" replace />
          ) : <Navigate to="/auth" replace />
        } />

        <Route element={session ? <Layout /> : <Navigate to="/auth" replace />}>
          <Route path="/" element={
            applicationStatus === 'pending' ? <Navigate to="/application-status" replace /> : <Dashboard />
          } />
          <Route path="/orders" element={
            applicationStatus === 'pending' ? <Navigate to="/application-status" replace /> : <Orders />
          } />
          <Route path="/menu" element={
            applicationStatus === 'pending' ? <Navigate to="/application-status" replace /> : <Menu />
          } />
          <Route path="/members" element={
            applicationStatus === 'pending' ? <Navigate to="/application-status" replace /> : <Members />
          } />
          <Route path="/earnings" element={
            applicationStatus === 'pending' ? <Navigate to="/application-status" replace /> : <Earnings />
          } />
          <Route path="/statements" element={
            applicationStatus === 'pending' ? <Navigate to="/application-status" replace /> : <Statements />
          } />
          <Route path="/settings" element={
            // Settings is allowed so they can see status/request role, but Layout might show sidebar. 
            // Actually Layout shows sidebar. Maybe we should allow Settings? 
            // But ApplicationStatus page is a full page override.
            // Let's redirect to ApplicationStatus for consistency if pending.
            applicationStatus === 'pending' ? <Navigate to="/application-status" replace /> : <Settings />
          } />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <Toaster />
      <AppContent />
    </AuthProvider>
  );
}

export default App;
