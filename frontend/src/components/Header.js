import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher';
import LoginModal from './LoginModal';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

/**
 * The header on the Scoreboard system.
 *
 * Three decisions carry it:
 *
 * 1. Two bands, not one. The wordmark and the account controls sit in the top
 *    band; navigation gets its own strip below. Cramming five destinations plus
 *    theme, about and auth into a single row is what made the old header the
 *    busiest thing on a page whose whole point is density.
 *
 * 2. The nav strip is the same object as the player page's tab bar — hairline
 *    rule, 9.5px tracked caps, a 2px underline on the active item. The only
 *    difference is the colour of that underline: --primary marks structure
 *    (where you are in the app), --live is reserved for real returns.
 *
 * 3. No icons. The controls are wide-tracked words in a gap-px strip, so the
 *    hairlines between them are the same hairlines as everywhere else. The one
 *    glyph left is the caret on the theme menu.
 *
 * Gutters match the page (max-w-[1280px], px-4 / md:px-7) so the wordmark sits
 * on the same left edge as the content below it.
 */

const navigation = [
  { name: 'HOME', href: '/' },
  { name: 'MY TEAM', href: '/my-team' },
  { name: 'DASHBOARD', href: '/dashboard' },
  { name: 'H2H LEAGUE', href: '/weekly-matchups' },
  // A player page is part of the Players section, so it lights the same item.
  { name: 'PLAYERS', href: '/player-statistics', also: ['/player/'] },
];

const isActive = (pathname, item) => {
  if (item.href === '/') return pathname === '/';
  const prefixes = [item.href, ...(item.also || [])];
  return prefixes.some((p) => pathname.startsWith(p));
};

/** A cell in the top-right control strip. Full band height, hairline gaps. */
const controlCell =
  'flex items-center bg-panel px-3.5 text-[9px] font-medium tracking-[0.18em] ' +
  'text-muted-foreground transition-colors hover:text-foreground';

/** A row in the mobile menu stack. No left padding: the label sits on the page
    gutter, in line with the wordmark above it, and the hairlines between rows
    run from the same edge. */
const menuRow =
  'flex min-h-[48px] items-center bg-panel pr-4 text-[10px] font-medium tracking-[0.16em] ' +
  'transition-colors';

const Header = ({ currentTheme, setTheme, setShowInfo }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, loading } = useAuth();

  const accountName = user?.user_metadata?.full_name || user?.email || '';

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      alert('Failed to sign out. Please try again.');
    }
  };

  return (
    <header className="relative z-50 border-b border-border bg-panel font-mono">
      {/* Tap outside to dismiss the mobile menu. Rendered before the nav so the
          header controls and the menu panel both stay clickable above it. */}
      {isMenuOpen && (
        <div
          className="lg:hidden fixed inset-0"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Band one: wordmark and account controls. */}
      <div className="relative mx-auto max-w-[1280px] px-4 md:px-7">
        <div className="flex h-[52px] items-center justify-between">
          {/* Type-only lockup. Split by weight rather than size, so it names the
              app without competing with a 25px hero name below it. */}
          <Link
            to="/"
            aria-label="FPL League Hub — home"
            className="flex items-baseline gap-[7px] leading-none"
          >
            <span className="text-[13px] font-bold tracking-[0.2em] text-foreground">FPL</span>
            <span className="text-[13px] tracking-[0.2em] text-muted-foreground">
              LEAGUE&nbsp;HUB
            </span>
          </Link>

          {/* Desktop controls. pl-px puts a hairline before the first cell too,
              so the strip reads as a segment of the bar rather than a floater. */}
          <div className="hidden self-stretch gap-px bg-border pl-px lg:flex">
            <ThemeSwitcher currentTheme={currentTheme} setTheme={setTheme} />

            <button onClick={() => setShowInfo(true)} className={controlCell}>
              ABOUT
            </button>

            {!loading &&
              (user ? (
                <>
                  <span
                    className="flex max-w-[168px] items-center bg-panel px-3.5 text-[9px] font-medium tracking-[0.18em] text-foreground"
                    title={accountName}
                  >
                    <span className="truncate">{accountName}</span>
                  </span>
                  <button onClick={handleSignOut} className={controlCell}>
                    SIGN OUT
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className={cn(controlCell, 'text-foreground')}
                >
                  LOG IN
                </button>
              ))}
          </div>

          {/* Mobile menu button. -mr-3.5 keeps the label's right edge on the
              gutter while the tap target stays the full band height. */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            className="-mr-3.5 flex h-[52px] items-center px-3.5 text-[9px] font-medium tracking-[0.18em] text-foreground lg:hidden"
          >
            {isMenuOpen ? 'CLOSE' : 'MENU'}
          </button>
        </div>
      </div>

      {/* Band two: navigation. Desktop only — five tracked caps will not sit in
          375px without scrolling, and mobile gets the same list in the menu. */}
      <nav className="hidden border-t border-border lg:block">
        <div className="mx-auto max-w-[1280px] px-4 md:px-7">
          {/* No horizontal padding on the items: the first label and its
              underline both start on the gutter, in line with the wordmark. */}
          <div className="flex gap-7">
            {navigation.map((item) => {
              const active = isActive(location.pathname, item);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`border-b-2 py-[13px] text-[9.5px] font-medium leading-none tracking-[0.14em] transition-colors ${
                    active
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile menu. Same panel behaviour as before — full width, tap outside
          to dismiss — restyled as a hairline-gapped stack. */}
      <div
        className={`absolute inset-x-0 top-full border-b border-border bg-panel transition-all duration-200 ease-in-out lg:hidden ${
          isMenuOpen ? 'opacity-100 translate-y-0' : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <div className="mx-auto max-w-[1280px] px-4 pb-4">
          <div className="flex flex-col gap-px bg-border">
            {navigation.map((item) => {
              const active = isActive(location.pathname, item);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`${menuRow} border-l-2 ${
                    active
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            <ThemeSwitcher currentTheme={currentTheme} setTheme={setTheme} variant="row" />

            <button
              onClick={() => {
                setIsMenuOpen(false);
                setShowInfo(true);
              }}
              className={`${menuRow} border-l-2 border-transparent text-muted-foreground`}
            >
              ABOUT
            </button>

            {!loading && user && (
              <span
                className={`${menuRow} border-l-2 border-transparent text-muted-foreground`}
                title={accountName}
              >
                <span className="truncate">{accountName}</span>
              </span>
            )}
          </div>

          {/* Auth sits outside the stack: it is an action, not a destination. */}
          {!loading && (
            <button
              onClick={() => {
                setIsMenuOpen(false);
                if (user) handleSignOut();
                else setIsLoginModalOpen(true);
              }}
              className="mt-3 min-h-[44px] w-full border border-border text-[9.5px] font-medium tracking-[0.14em] text-primary-lighter"
            >
              {user ? 'SIGN OUT' : 'LOG IN →'}
            </button>
          )}
        </div>
      </div>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </header>
  );
};

export default Header;
