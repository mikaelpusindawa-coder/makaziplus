import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { BottomNav, DesktopSidebar } from './components/layout/BottomNav';
import { Spinner } from './components/common/Spinner';

// Pages
import Auth from './pages/Auth';
import Home from './pages/Home';
import Search from './pages/Search';
import PropertyDetail from './pages/PropertyDetail';
import Chat from './pages/Chat';
import AddProperty from './pages/AddProperty';
import Dashboard from './pages/Dashboard';
import Favorites from './pages/Favorites';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';
import Admin from './pages/Admin';
import ForgotPassword from './pages/ForgotPassword';
import HelpCenter from './pages/HelpCenter';
import Verification from './pages/Verification';
import Bookings from './pages/Bookings';

const LoadScreen = () => (
  <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center gap-4 z-50">
    <div className="font-serif text-3xl font-semibold text-primary animate-pulse-soft">
      Makazi<span className="text-gold">Plus</span>
    </div>
    <Spinner />
    <p className="text-xs text-ink-6 tracking-widest uppercase font-medium">Makazi Kiganjani</p>
  </div>
);

     // Auth Guard Component
const Guard = ({ children, adminOnly }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;

  return children;
};

// Guest Guard (redirects to home if already logged in)
const GuestGuard = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadScreen />;
  if (user) return <Navigate to="/" replace />;

  return children;
};


// Responsive layout wrapper
const Shell = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadScreen />;

  return (
    <div className={user ? 'md:flex md:min-h-screen' : ''}>
      {user && <DesktopSidebar />}
      <div className="flex-1 min-w-0 relative">
        <div className={user ? 'max-w-lg mx-auto md:max-w-none md:mx-0' : 'max-w-lg mx-auto'}>
          {children}
        </div>
        {user && <BottomNav />}       
      </div>
    </div>
  );
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes - No Auth Required */}
      <Route path="/" element={<Shell><Home /></Shell>} />
      <Route path="/search" element={<Shell><Search /></Shell>} />
      <Route path="/property/:id" element={<Shell><PropertyDetail /></Shell>} />
      <Route path="/help" element={<Shell><HelpCenter /></Shell>} />
      <Route path="/privacy" element={<Shell><HelpCenter /></Shell>} />
      <Route path="/terms" element={<Shell><HelpCenter /></Shell>} />
      
      {/* Auth Routes - Guest Only */}
      <Route path="/auth" element={<GuestGuard><Auth /></GuestGuard>} />
      <Route path="/forgot-password" element={<GuestGuard><ForgotPassword /></GuestGuard>} />
      
      {/* Protected Routes - Auth Required */}
      <Route path="/chat" element={<Shell><Guard><Chat /></Guard></Shell>} />
      <Route path="/add" element={<Shell><Guard><AddProperty /></Guard></Shell>} />
      <Route path="/dashboard" element={<Shell><Guard><Dashboard /></Guard></Shell>} />
      <Route path="/favorites" element={<Shell><Guard><Favorites /></Guard></Shell>} />
      <Route path="/notifications" element={<Shell><Guard><Notifications /></Guard></Shell>} />
      <Route path="/profile" element={<Shell><Guard><Profile /></Guard></Shell>} />
      <Route path="/subscription" element={<Shell><Guard><Subscription /></Guard></Shell>} />
      <Route path="/verification" element={<Shell><Guard><Verification /></Guard></Shell>} />
      <Route path="/bookings" element={<Shell><Guard><Bookings /></Guard></Shell>} />
      
      {/* Admin Only Routes */}
      <Route path="/admin" element={<Shell><Guard adminOnly><Admin /></Guard></Shell>} />
      
      {/* 404 Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}