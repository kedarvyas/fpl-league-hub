import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Header from './Header';
import { useLocalStorage } from '../hooks/useLocalStorage';

const Layout = ({ children }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [currentTheme, setTheme] = useLocalStorage('theme', 'light');

  useEffect(() => {
    // Update the data-theme attribute
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  const AboutModal = () => (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card text-card-foreground rounded-lg shadow-xl max-w-md w-full relative overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-darker to-primary p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">About FPL League Hub</h2>
            <button
              onClick={() => setShowInfo(false)}
              className="text-white hover:text-primary-lighter transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-4">
            <p className="font-medium text-lg text-card-foreground">
              FPL Hub for Head-to-Head Leagues
            </p>

            <p className="text-muted-foreground">
              A comprehensive dashboard for Fantasy Premier League Head-to-Head leagues,
              providing detailed analytics, player statistics, and league performance tracking.
            </p>

            <div className="space-y-2">
              <p className="font-medium text-card-foreground">Built with:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>React & React Router</li>
                <li>Tailwind CSS</li>
                <li>FastAPI Backend</li>
                <li>SQLAlchemy & PostgreSQL</li>
                <li>Recharts for Data Visualization</li>
                <li>Lucide React Icons</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-border text-sm text-muted-foreground">
            built by a human on earth - version 1.1.5
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-gradient-to-r from-primary-darker to-primary shadow-lg">
        <Header 
          currentTheme={currentTheme}
          setTheme={setTheme}
          setShowInfo={setShowInfo}
        />
      </div>

      <main className="transition-colors duration-300">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {showInfo && <AboutModal />}
    </div>
  );
};

export default Layout;