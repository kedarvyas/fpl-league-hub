import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Table,
  ChartBar,
  X,
  Menu,
  Info,
  Moon,
  Sun,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: <Home className="w-4 h-4" /> },
  { name: 'Weekly Matchups', href: '/weekly-matchups', icon: <Users className="w-4 h-4" /> },
  { name: 'Player Statistics', href: '/player-statistics', icon: <ChartBar className="w-4 h-4" /> },
  { name: 'League Standings', href: '/standings', icon: <Table className="w-4 h-4" /> },
];

const Header = ({ isDark, setIsDark, setShowInfo }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Define text color based on theme
  const textColor = isDark ? "text-white" : "text-gray-900";
  const iconColor = isDark ? "text-white" : "text-gray-900";
  const bgHover = isDark ? "hover:bg-white/15" : "hover:bg-gray-100";
  const activeBg = isDark ? "bg-white/25" : "bg-gray-100";

  const ThemeToggle = () => (
    <button
      onClick={() => setIsDark(!isDark)}
      className={`p-2 rounded-lg transition-colors ${textColor} ${bgHover}`}
      title={isDark ? 'Light Mode' : 'Dark Mode'}
    >
      {isDark ? (
        <Sun className={`w-5 h-5 ${iconColor}`} />
      ) : (
        <Moon className={`w-5 h-5 ${iconColor}`} />
      )}
    </button>
  );

  return (
    <header className="relative z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`w-full py-4 flex items-center justify-between ${textColor}`}>
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-white/20' : 'bg-gray-100'}`}>
                <Home className={`w-6 h-6 ${iconColor}`} />
              </div>
              <span className={`text-2xl font-bold ${textColor}`}>FPL League Hub</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:space-x-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${location.pathname === item.href
                    ? `${activeBg} ${textColor} shadow-lg`
                    : `${textColor} ${bgHover}`
                  }
                `}
              >
                <div className="flex items-center space-x-2">
                  <span className={iconColor}>{item.icon}</span>
                  <span>{item.name}</span>
                </div>
              </Link>
            ))}

            <ThemeToggle />

            <button
              onClick={() => setShowInfo(true)}
              className={`p-2 rounded-lg transition-colors ${textColor} ${bgHover}`}
              title="About"
            >
              <Info className={`w-5 h-5 ${iconColor}`} />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-lg transition-colors ${textColor} ${bgHover}`}
            >
              {isMenuOpen ? (
                <X className={`w-6 h-6 ${iconColor}`} />
              ) : (
                <Menu className={`w-6 h-6 ${iconColor}`} />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div
        className={`lg:hidden absolute w-full shadow-lg transition-all duration-200 ease-in-out
          ${isDark ? 'bg-primary/95' : 'bg-white'} backdrop-blur-sm
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
                flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                ${location.pathname === item.href
                  ? `${activeBg} ${textColor} shadow-lg`
                  : `${textColor} ${bgHover}`
                }
              `}
            >
              <span className={iconColor}>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
          <div className="flex items-center justify-between px-4 py-3">
            <ThemeToggle />
            <button
              onClick={() => {
                setIsMenuOpen(false);
                setShowInfo(true);
              }}
              className={`p-2 rounded-lg transition-colors ${textColor} ${bgHover}`}
              title="About"
            >
              <Info className={`w-5 h-5 ${iconColor}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;