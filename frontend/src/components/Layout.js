import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  UsersIcon, 
  TableCellsIcon, 
  ChartBarIcon, 
  Bars3Icon as MenuIcon, 
  XMarkIcon as XIcon 
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'League Standings', href: '/standings', icon: TableCellsIcon },
  { name: 'Weekly Matchups', href: '/weekly-matchups', icon: UsersIcon },
  { name: 'Statistics', href: '/statistics', icon: ChartBarIcon },
];

const Layout = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-purple-800 shadow-lg">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
          <div className="w-full py-6 flex items-center justify-between border-b border-purple-500 lg:border-none">
            <div className="flex items-center">
              <Link to="/">
                <span className="text-white text-2xl font-bold">FPL League Hub</span>
              </Link>
            </div>
            <div className="hidden lg:flex lg:items-center">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-base font-medium text-white hover:text-purple-200 px-4 py-2 ${
                    location.pathname === item.href ? 'bg-purple-900' : ''
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="lg:hidden">
              <button
                type="button"
                className="bg-purple-700 p-2 rounded-md text-white hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-white"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? (
                  <XIcon className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          <div className={`lg:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium text-white hover:text-purple-200 hover:bg-purple-700 ${
                    location.pathname === item.href ? 'bg-purple-900' : ''
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;