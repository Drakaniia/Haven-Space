import { Link } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth-context';
import { UserMenu } from './UserMenu';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/our-story', label: 'Our Story' },
  { to: '/teams', label: 'Our Team' },
  { to: '/for-landlords', label: 'For Landlords' },
  { to: '/haven-ai', label: 'Haven AI' },
] as const;

export function PublicNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/assets/images/Haven_Space_Logo.png"
            alt="Haven Space"
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-bold text-primary">Haven Space</span>
        </Link>
        <ul className="hidden items-center gap-6 md:flex">
          {LINKS.map(link => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="text-sm font-medium text-gray-ink hover:text-primary"
                activeProps={{ className: 'text-primary font-semibold' }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <Link
                to="/auth/login"
                className="text-sm font-medium text-gray-ink hover:text-primary"
              >
                Log in
              </Link>
              <Link
                to="/auth/choose"
                className="rounded-full bg-primary-strong px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Join now
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
