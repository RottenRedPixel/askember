import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import useStore from '@/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Header() {
  const { user, userProfile, isAdmin, logout } = useStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  
  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
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
  
  // Helper function to get user initials
  const getUserInitials = (email) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
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
                  className={getLinkClasses("/admin")}
                >
                  Admin
                </Link>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.avatar_url || ""} alt={user.email} />
                      <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                        {getUserInitials(user.email, userProfile?.first_name, userProfile?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  
                  {/* User dropdown menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="py-2">
                        <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
                          {user.email}
                        </div>
                        <Link
                          to="/settings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Settings
                        </Link>
                        <button
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
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
                    className={getMobileLinkClasses("/admin")}
                    onClick={handleMobileLinkClick}
                  >
                    Admin
                  </Link>
                )}
                
                <div className="border-t border-gray-200 mt-2 pt-2">
                  {user ? (
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={userProfile?.avatar_url || ""} alt={user.email} />
                          <AvatarFallback className="bg-blue-100 text-blue-800 text-sm">
                            {getUserInitials(user.email, userProfile?.first_name, userProfile?.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-sm text-gray-600">
                          {user.email}
                        </div>
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