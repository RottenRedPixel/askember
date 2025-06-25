import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import useStore from '@/store';
import { Badge } from '@/components/ui/badge';

export default function Header() {
  const { user, userProfile, isAdmin, logout } = useStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Helper function to determine if a link is active
  const isActive = (path) => location.pathname === path;
  
  // Helper function to get link classes based on active state
  const getLinkClasses = (path, baseClasses = "px-4 py-2 font-medium transition-colors") => {
    const activeClasses = isActive(path) 
      ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600" 
      : "text-gray-700 hover:text-blue-600";
    return `${baseClasses} ${activeClasses}`;
  };
  
  // Mobile link classes
  const getMobileLinkClasses = (path) => {
    const activeClasses = isActive(path)
      ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600"
      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50";
    return `block px-4 py-3 font-medium transition-colors ${activeClasses}`;
  };
  
  // Close mobile menu when clicking a link
  const handleMobileLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header>
      <nav className="mb-6">
        {/* Desktop Navigation */}
        <div className="hidden md:flex justify-between items-center">
          {/* Left side - Brand */}
          <Link to="/" className="text-xl font-bold text-gray-900">
            ember
          </Link>
          
          {/* Right side - Navigation and User */}
          <div className="flex items-center gap-8">
            <div className="flex gap-8">
              <Link 
                to="/" 
                className={getLinkClasses("/")}
              >
                Home
              </Link>
              <Link 
                to="/about" 
                className={getLinkClasses("/about")}
              >
                About
              </Link>
              {user && (
                <Link 
                  to="/dashboard" 
                  className={getLinkClasses("/dashboard")}
                >
                  Dashboard
                </Link>
              )}
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className={`${getLinkClasses("/admin", "px-4 py-2 font-medium transition-colors flex items-center gap-2")} ${
                    isActive("/admin") ? "hover:text-red-700" : "hover:text-red-600"
                  }`}
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
                  <span className="text-sm text-gray-600 hidden lg:block">
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
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-xl font-bold text-gray-900">
              ember
            </Link>
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="mt-4 border-t border-gray-200 bg-white shadow-lg rounded-lg">
              <div className="py-2">
                <Link 
                  to="/" 
                  className={getMobileLinkClasses("/")}
                  onClick={handleMobileLinkClick}
                >
                  Home
                </Link>
                <Link 
                  to="/about" 
                  className={getMobileLinkClasses("/about")}
                  onClick={handleMobileLinkClick}
                >
                  About
                </Link>
                {user && (
                  <Link 
                    to="/dashboard" 
                    className={getMobileLinkClasses("/dashboard")}
                    onClick={handleMobileLinkClick}
                  >
                    Dashboard
                  </Link>
                )}
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className={`${getMobileLinkClasses("/admin")} flex items-center justify-between`}
                    onClick={handleMobileLinkClick}
                  >
                    <span>Admin</span>
                    <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                      {userProfile?.role === 'super_admin' ? 'SUPER' : 'ADMIN'}
                    </Badge>
                  </Link>
                )}
                
                <div className="border-t border-gray-200 mt-2 pt-2">
                  {user ? (
                    <div className="px-4 py-2">
                      <div className="text-sm text-gray-600 mb-3">
                        {user.email}
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          handleMobileLinkClick();
                        }}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <Link 
                      to="/login" 
                      className={getMobileLinkClasses("/login")}
                      onClick={handleMobileLinkClick}
                    >
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
} 