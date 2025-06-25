import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import useStore from './store';
import Layout from './components/layout/Layout';
import About from './components/pages/About';
import Create from './components/pages/Create';
import Dashboard from './components/pages/Dashboard';
import Settings from './components/pages/Settings';
import AdminDashboard from './components/pages/AdminDashboard';
import AuthGuard from './components/auth/AuthGuard';
import AdminGuard from './components/auth/AdminGuard';
import AuthCallback from './components/auth/AuthCallback';
import AuthPage from './components/auth/AuthPage';
import './App.css'

export default function App() {
  const { initializeAuth } = useStore();

  // Initialize authentication state on app startup
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<About />} />
        <Route path="/create" element={<Create />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/embers" element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        } />
        <Route path="/settings" element={
          <AuthGuard>
            <Settings />
          </AuthGuard>
        } />
        <Route path="/admin" element={
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        } />
      </Routes>
    </Layout>
  );
}
