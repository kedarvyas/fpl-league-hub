import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import { useLocalStorage } from '../hooks/useLocalStorage';

/**
 * Routes already rebuilt on the Scoreboard system carry their own gutters and
 * vertical rhythm (max-w-[1280px], px-4 / md:px-7) — wrapping them in the
 * legacy container double-padded them, so their content no longer lined up with
 * the header's wordmark. The legacy container stays for everything else; when
 * this list covers every route, both it and this branch go away.
 */
const SCOREBOARD_ROUTES = ['/player/', '/weekly-matchups', '/player-statistics', '/dashboard'];

const Layout = ({ children }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [currentTheme, setTheme] = useLocalStorage('theme', 'light');
  const { pathname } = useLocation();

  const onScoreboard = SCOREBOARD_ROUTES.some((route) => pathname.startsWith(route));

  useEffect(() => {
    // Update the data-theme attribute
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  const AboutModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 font-mono backdrop-blur-sm"
      onClick={() => setShowInfo(false)}
    >
      <div
        className="w-full max-w-md border border-border bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground">
            About
          </h2>
          <button
            onClick={() => setShowInfo(false)}
            aria-label="Close"
            className="-mr-2 flex h-11 w-11 items-center justify-center text-[11px] tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="px-4 pb-5 pt-4">
          <p className="text-[16px] font-bold uppercase leading-[1.15] tracking-[-0.02em] text-foreground">
            FPL Hub for
            <br />
            Head-to-Head Leagues
          </p>

          <p className="mt-3 text-[11px] leading-[1.6] text-muted-foreground">
            A dashboard for Fantasy Premier League Head-to-Head leagues — analytics, player
            statistics and league performance tracking.
          </p>

          <div className="flex items-center gap-2 pt-[22px] pb-2.5">
            <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Built with
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-px bg-border">
            {['React', 'Tailwind', 'FastAPI', 'PostgreSQL', 'Recharts', 'Supabase'].map((tool) => (
              <span
                key={tool}
                className="bg-panel px-3 py-2.5 text-[9px] font-medium uppercase tracking-[0.13em] text-muted-foreground"
              >
                {tool}
              </span>
            ))}
          </div>

          <p className="mt-4 text-[7.5px] uppercase tracking-[0.12em] text-muted-foreground">
            Built by a human on earth · v1.1.5
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header currentTheme={currentTheme} setTheme={setTheme} setShowInfo={setShowInfo} />

      <main className="transition-colors duration-300">
        {onScoreboard ? (
          children
        ) : (
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</div>
        )}
      </main>

      {showInfo && <AboutModal />}
    </div>
  );
};

export default Layout;
