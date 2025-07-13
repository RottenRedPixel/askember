import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useStore from './store';
import Layout from './components/layout/Layout';
import About from './components/pages/About';
import Create from './components/pages/Create';
import MyEmbers from './components/pages/MyEmbers';
import EmberDetail from './components/pages/EmberDetail';
import EmberPlay from './components/pages/EmberPlay';
import StoryCutStudio from './components/pages/StoryCutStudio';
import EmberRedirect from './components/EmberRedirect';
import Settings from './components/pages/Settings';
import AuthGuard from './components/auth/AuthGuard';
import AdminGuard from './components/auth/AdminGuard';
import AuthCallback from './components/auth/AuthCallback';
import AuthPage from './components/auth/AuthPage';
import PasswordGate from './components/auth/PasswordGate';

// Admin Components
import AdminLayout from './components/admin/layout/AdminLayout';
import AdminDashboard from './components/admin/dashboard/AdminDashboard';
import UserManagement from './components/admin/users/UserManagement';
import PromptManagement from './components/admin/prompts/PromptManagement';
import { addPrimaryStoryCutColumn, runPublicEmberAccessMigration } from './lib/database';
import './App.css'


export default function App() {
  const { initializeAuth } = useStore();
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  // Initialize authentication state on app startup
  useEffect(() => {
    initializeAuth();

    // Check if password is already verified
    const isPasswordVerified = localStorage.getItem('askember_password_verified');
    if (isPasswordVerified === 'true') {
      setIsPasswordVerified(true);
    }

    // Run database migrations
    const runMigrations = async () => {
      try {
        // Add primary_story_cut_id column if it doesn't exist
        await addPrimaryStoryCutColumn();
        // Create public ember access function for sharing
        await runPublicEmberAccessMigration();
      } catch (error) {
        console.error('Error running migrations:', error);
      }
    };

    runMigrations();
  }, [initializeAuth]);

  // Show password gate if not verified
  if (!isPasswordVerified) {
    return (
      <PasswordGate
        onPasswordCorrect={() => setIsPasswordVerified(true)}
      />
    );
  }

  return (
    <Routes>
      {/* Public share route - identical to ember route */}
      <Route path="/share/:id" element={<EmberPlay />} />

      {/* Ember management route without layout (editing/management view) */}
      <Route path="/embers/:id/manage" element={<EmberDetail />} />

      {/* Ember play route - identical to share route */}
      <Route path="/embers/:id" element={<EmberRedirect />} />

      {/* StoryCut Studio route without layout (full-screen editor) */}
      <Route path="/embers/:id/studio" element={<StoryCutStudio />} />

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
