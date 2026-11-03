import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { accountHomeEntry } from '../../lib/nav';
import type { AuthUser } from '../../lib/types';
import { setPendingToast } from '../../lib/toast';
import { useBoarderStatus } from '../../lib/use-boarder-nav';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';

function roleSettings(role: AuthUser['role']): string | null {
  if (role === 'admin') return null; // admin has no settings page
  return role === 'landlord' ? '/landlord/settings' : '/boarder/settings';
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Only boarders have a status-dependent home; skip the extra `/auth/me` call
  // for the other roles. Shares the shell's query key, so it usually costs
  // nothing extra on boarder pages.
  const isBoarder = user?.role === 'boarder';
  const boarderStatus = useBoarderStatus({ enabled: isBoarder });

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const settingsPath = roleSettings(user.role);
  const home = accountHomeEntry(user.role, isBoarder ? boarderStatus : undefined);
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${fullName}`}
        onClick={() => setOpen(value => !value)}
        className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-2 transition-colors ${
          open ? 'border-primary bg-mint' : 'border-border hover:bg-mint/60'
        }`}
      >
        <Avatar user={user} size={30} />
        <span className="max-w-28 truncate text-sm font-medium">{user.first_name}</span>
        <Icon
          name="chevronDown"
          size={14}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="menu-pop absolute right-0 z-40 mt-2 w-56 origin-top-right rounded-xl border border-border bg-surface py-1.5 shadow-pop"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar user={user} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{fullName}</p>
                <p className="truncate text-xs capitalize text-gray-ink">{user.role}</p>
              </div>
            </div>
            <p className="mt-2 truncate text-xs text-muted">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              to={home.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-ink hover:bg-mint/60 hover:text-primary"
            >
              <Icon name="home" size={16} className="shrink-0" />
              {home.label}
            </Link>
            {settingsPath ? (
              <Link
                to={settingsPath}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-ink hover:bg-mint/60 hover:text-primary"
              >
                <Icon name="settings" size={16} className="shrink-0" />
                Profile &amp; settings
              </Link>
            ) : null}
          </div>

          <div className="border-t border-border py-1">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-error hover:bg-mint/60"
              onClick={async () => {
                setOpen(false);
                await logout();
                setPendingToast('success', "You've been logged out. See you soon!");
                void navigate({ to: '/auth/login' });
              }}
            >
              <Icon name="logout" size={16} className="shrink-0" />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
