import { Link } from 'react-router-dom';
import useStore from '@/store';
import { Badge } from '@/components/ui/badge';

export default function Header() {
  const { user, userProfile, isAdmin, logout } = useStore();

  return (
    <header>
      <nav className="mb-8 flex justify-between items-center">
        <div className="flex gap-8">
          <Link 
            to="/" 
            className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
          >
            Home
          </Link>
          <Link 
            to="/about" 
            className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
          >
            About
          </Link>
          {user && (
            <Link 
              to="/dashboard" 
              className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link 
              to="/admin" 
              className="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition-colors flex items-center gap-2"
            >
              Admin
              <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                {userProfile?.role === 'super_admin' ? 'SUPER' : 'ADMIN'}
              </Badge>
            </Link>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.email}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link 
              to="/login" 
              className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
} 