import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import useStore from './store';
import Layout from './components/layout/Layout';
import About from './components/pages/About';
import Create from './components/pages/Create';
import MyEmbers from './components/pages/MyEmbers';
import EmberDetail from './components/pages/EmberDetail';
import Test from './components/pages/Test';
import ElevenLabsTest from './components/pages/ElevenLabsTest';
import Sandbox from './components/pages/Sandbox';
import Settings from './components/pages/Settings';
import AdminDashboard from './components/pages/AdminDashboard';
import DevDashboard from './components/pages/DevDashboard';
import StyleGuide from './components/pages/StyleGuide';
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
    <Routes>
      {/* Ember detail route without layout (no header, light pink background) */}
      <Route path="/embers/:id" element={<EmberDetail />} />
      
      {/* All other routes with layout */}
      <Route path="/*" element={
        <Layout>
          <Routes>
            <Route path="/" element={<About />} />
            <Route path="/create" element={<Create />} />
            <Route path="/test" element={<Test />} />
            <Route path="/eleven" element={<ElevenLabsTest />} />
            <Route path="/sandbox" element={<Sandbox />} />
            <Route path="/style" element={<StyleGuide />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/embers" element={
              <AuthGuard>
                <MyEmbers />
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
            <Route path="/dev" element={
              <AdminGuard>
                <DevDashboard />
              </AdminGuard>
            } />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
}
