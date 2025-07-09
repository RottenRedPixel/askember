import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import useStore from './store';
import Layout from './components/layout/Layout';
import About from './components/pages/About';
import Create from './components/pages/Create';
import MyEmbers from './components/pages/MyEmbers';
import EmberDetail from './components/pages/EmberDetail';
import Settings from './components/pages/Settings';
import AuthGuard from './components/auth/AuthGuard';
import AdminGuard from './components/auth/AdminGuard';
import AuthCallback from './components/auth/AuthCallback';
import AuthPage from './components/auth/AuthPage';

// Admin Components
import AdminLayout from './components/admin/layout/AdminLayout';
import AdminDashboard from './components/admin/dashboard/AdminDashboard';
import UserManagement from './components/admin/users/UserManagement';
import PromptManagement from './components/admin/prompts/PromptManagement';
import { addPrimaryStoryCutColumn } from './lib/database';
import './App.css'


export default function App() {
  const { initializeAuth } = useStore();

  // Initialize authentication state on app startup
  useEffect(() => {
    initializeAuth();
    
    // Run database migrations
    const runMigrations = async () => {
      try {
        // Add primary_story_cut_id column if it doesn't exist
        await addPrimaryStoryCutColumn();
      } catch (error) {
        console.error('Error running migrations:', error);
      }
    };
    
    runMigrations();
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
            
            {/* Admin Routes */}
            <Route path="/admin/*" element={
              <AdminGuard>
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/prompts" element={<PromptManagement />} />
                  </Routes>
                </AdminLayout>
              </AdminGuard>
            } />

          </Routes>
        </Layout>
      } />
    </Routes>
  );
}
