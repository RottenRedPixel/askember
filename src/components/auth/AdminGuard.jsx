import { Navigate, useLocation } from 'react-router-dom';
import useStore from '@/store';

export default function AdminGuard({ children }) {
  const { user, userProfile, isLoading } = useStore();
  const location = useLocation();

  console.log('AdminGuard state:', { 
    user: user?.id, 
    userProfile: userProfile?.role, 
    isLoading,
    currentPath: location.pathname
  });

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated, preserving the current location
  if (!user) {
    console.log('AdminGuard: No user, redirecting to login with redirect:', location.pathname);
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Check if user is super admin
  const isSuperAdmin = userProfile?.role === 'super_admin';
  
  if (!isSuperAdmin) {
    console.log('AdminGuard: User is not super admin, role:', userProfile?.role);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need super admin privileges to access this area.</p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  console.log('AdminGuard: Access granted, user is super admin');

  return children;
} 