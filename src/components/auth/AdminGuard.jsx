import { Navigate } from 'react-router-dom';
import useStore from '@/store';

export default function AdminGuard({ children }) {
  const { user, userProfile, isLoading, isAdmin } = useStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this area.</p>
          <p className="text-sm text-gray-500 mt-2">
            Current role: {userProfile?.role || 'user'}
          </p>
        </div>
      </div>
    );
  }

  return children;
} 