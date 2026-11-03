import { Link, useLocation } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { UserMenu } from './UserMenu';

const LINKS = [
  { to: '/find-a-room', label: 'Find a room' },
  { to: '/for-landlords', label: 'For landlords' },
  { to: '/haven-ai', label: 'Haven AI' },
  { to: '/our-story', label: 'Our story' },
  { to: '/teams', label: 'Team' },
] as const;

/**
 * Public site header. Translucent paper chrome that content scrolls under,
 * with a hairline that only appears once the page has scrolled (a scroll edge,
 * not a permanent divider). Below `md` the links fold into a menu sheet.
 */
export function PublicNavbar() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header
      className={`chrome-topbar sticky top-0 z-40 border-b transition-colors duration-200 ${
        scrolled || menuOpen ? 'border-border' : 'border-transparent'
      }`}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8"
      >
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Haven Space home">
          <img
            src="/assets/images/Haven_Space_Logo.png"
            alt=""
            className="h-8 w-8 object-contain"
          />
          <span className="font-display text-lg font-semibold tracking-[-0.01em] text-ink">
            Haven Space
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map(link => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-ink transition-colors hover:bg-subtle hover:text-ink"
                activeProps={{ className: '!text-ink bg-subtle' }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <Link
                to="/auth/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-subtle sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                to="/auth/choose"
                className="inline-flex h-9 items-center rounded-xl bg-primary-strong px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-primary-hover active:scale-[0.97]"
              >
                Join Haven
              </Link>
            </>
          )}
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            onClick={() => setMenuOpen(v => !v)}
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-xl text-ink transition-colors hover:bg-subtle md:hidden"
          >
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none">
              {menuOpen ? (
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 7h14M3 13h14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div
          id="public-mobile-menu"
          className="menu-pop origin-top border-t border-border bg-surface md:hidden"
        >
          <ul className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            {LINKS.map(link => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="flex h-12 items-center rounded-xl px-3 text-base font-medium text-ink hover:bg-subtle"
                  activeProps={{ className: 'bg-mint !text-primary-dark' }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {!isAuthenticated ? (
              <li className="mt-2 border-t border-border pt-3">
                <Link
                  to="/auth/login"
                  className="flex h-12 items-center rounded-xl px-3 text-base font-semibold text-ink hover:bg-subtle"
                >
                  Log in
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
