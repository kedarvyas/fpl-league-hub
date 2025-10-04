import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher';
import LoginModal from './LoginModal';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Users,
  Table,
  ChartBar,
  X,
  Menu,
  Info,
  User,
  LogIn,
  LogOut,
} from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: <Home className="w-4 h-4" /> },
  { name: 'My Team', href: '/my-team', icon: <User className="w-4 h-4" /> },
  { name: 'Dashboard', href: '/dashboard', icon: <ChartBar className="w-4 h-4" /> },
  { name: 'H2H League Info', href: '/weekly-matchups', icon: <Users className="w-4 h-4" /> },
  { name: 'Player Statistics', href: '/player-statistics', icon: <ChartBar className="w-4 h-4" /> },
];

const Header = ({ currentTheme, setTheme, setShowInfo }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, loading } = useAuth();

  // Updated theme-based styling
  const bgHover = "hover:bg-muted/80";
  const activeBg = "bg-muted";

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      alert('Failed to sign out. Please try again.');
    }
  };

  return (
    <header className="relative z-50 bg-background">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-muted">
                <Home className="w-6 h-6 text-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">FPL League Hub</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:space-x-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors text-foreground
                  ${location.pathname === item.href ? activeBg : bgHover}
                `}
              >
                <div className="flex items-center space-x-2">
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </div>
              </Link>
            ))}

            <ThemeSwitcher currentTheme={currentTheme} setTheme={setTheme} />

            <button
              onClick={() => setShowInfo(true)}
              className={`p-2 rounded-lg transition-colors ${bgHover}`}
              title="About"
            >
              <Info className="w-5 h-5 text-foreground" />
            </button>

            {/* Auth Button */}
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-2 rounded-lg bg-muted">
                      <span className="text-sm font-medium text-foreground">
                        {user.user_metadata?.full_name || user.email}
                      </span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className={`p-2 rounded-lg transition-colors ${bgHover}`}
                      title="Sign Out"
                    >
                      <LogOut className="w-5 h-5 text-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="font-medium">Log In</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-lg transition-colors ${bgHover}`}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-foreground" />
              ) : (
                <Menu className="w-6 h-6 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div
        className={`lg:hidden absolute w-full shadow-lg transition-all duration-200 ease-in-out
          bg-background/95 backdrop-blur-sm
          ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}
        `}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setIsMenuOpen(false)}
              className={`
                flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-foreground
                ${location.pathname === item.href ? activeBg : bgHover}
              `}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="w-[160px]"> {/* Fixed width container */}
              <ThemeSwitcher currentTheme={currentTheme} setTheme={setTheme} />
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setShowInfo(true);
                }}
                className={`p-2 rounded-lg transition-colors ${bgHover}`}
                title="About"
              >
                <Info className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>

          {/* Mobile Auth Button */}
          {!loading && (
            <div className="px-4 pb-2">
              {user ? (
                <div className="space-y-2">
                  <div className="px-4 py-3 rounded-lg bg-muted">
                    <span className="text-sm font-medium text-foreground">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleSignOut();
                    }}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${bgHover}`}
                  >
                    <LogOut className="w-5 h-5 text-foreground" />
                    <span className="font-medium text-foreground">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsLoginModalOpen(true);
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  <span className="font-medium">Log In</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </header>
  );
};

export default Header;