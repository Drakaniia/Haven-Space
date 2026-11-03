import { Link, useLocation } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { messagesPath } from '../../lib/messages';
import type { NavItem } from '../../lib/nav';
import { useUnreadMessages } from '../../lib/use-unread-messages';
import { Icon } from '../ui/Icon';

/** Stable, order-independent key fragment for a nav item's search params. */
function searchKey(search: Record<string, string>): string {
  return Object.keys(search)
    .sort()
    .map(key => `${key}=${search[key]}`)
    .join('&');
}

const ROLE_LABEL: Record<string, string> = {
  boarder: 'Boarder',
  landlord: 'Landlord',
  admin: 'Admin console',
};

function useNavGroups(nav: NavItem[]) {
  return useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const item of nav) {
      const key = item.group ?? 'Main';
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [nav]);
}

/**
 * The nav list itself, shared by the pinned desktop rail and the mobile drawer
 * so both always agree about what exists and what is active.
 */
function NavList({
  nav,
  collapsed,
  onNavigate,
}: {
  nav: NavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  // The unread total rides on the Messages item itself rather than on a
  // `NavItem` field: the nav lists are shared constants, and one shared query
  // keeps the badge and the inbox in sync (spec `messages-feature-review` R9).
  const messagesItemPath = messagesPath(user?.role);
  const unread = useUnreadMessages(user?.role === 'boarder' || user?.role === 'landlord');
  const groups = useNavGroups(nav);

  return (
    <>
      {groups.map(([group, items], index) => (
        <div key={group} className={index === 0 ? 'px-3' : 'mt-6 px-3'}>
          {!collapsed && groups.length > 1 ? (
            <p className="mb-1.5 px-3 text-xs font-semibold text-muted">{group}</p>
          ) : null}
          {collapsed && index > 0 ? (
            <span aria-hidden="true" className="mx-auto mb-3 block h-px w-8 bg-border" />
          ) : null}
          <div className="space-y-0.5">
            {items.map(item => {
              const unreadCount = item.to === messagesItemPath ? unread : 0;

              return (
                <Link
                  // `to` alone is not unique root-wide: admin's eight sections all sit on
                  // `/admin` and differ only by search (`admin-apple-ui-restructure` R7).
                  key={`${item.to}${item.search ? `?${searchKey(item.search)}` : ''}`}
                  to={item.to}
                  // `Link` matches on search by default, so passing `search` keeps exactly
                  // one admin section active at a time.
                  search={item.search}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  // `Link` emits `aria-current="page"` on the active item and merges
                  // `activeProps.className` with the base classes.
                  className={`group relative flex items-center gap-3 rounded-xl text-[0.9375rem] text-gray-ink transition-[background-color,color,transform] duration-150 ease-out hover:bg-subtle hover:text-ink active:scale-[0.98] motion-reduce:transition-none ${
                    collapsed ? 'h-11 justify-center' : 'h-10 px-3'
                  }`}
                  activeProps={{
                    className: 'bg-mint !text-primary-dark font-semibold hover:bg-mint',
                  }}
                >
                  <Icon name={item.icon} size={20} className="shrink-0" />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  {unreadCount > 0 ? (
                    collapsed ? (
                      <span
                        aria-label={`${unreadCount} unread ${
                          unreadCount === 1 ? 'message' : 'messages'
                        }`}
                        className="absolute right-2 top-2 h-2 w-2 rounded-full bg-clay ring-2 ring-surface"
                      />
                    ) : (
                      <span
                        aria-label={`${unreadCount} unread ${
                          unreadCount === 1 ? 'message' : 'messages'
                        }`}
                        className="ml-auto min-w-5 rounded-full bg-clay px-1.5 text-center text-[11px] font-bold leading-5 text-white"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function Brand({ collapsed, role }: { collapsed: boolean; role?: string }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="Haven Space home">
      <img
        src="/assets/images/Haven_Space_Logo.png"
        alt=""
        className="h-8 w-8 shrink-0 object-contain"
      />
      {!collapsed ? (
        <span className="min-w-0 leading-tight">
          <span className="block font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
            Haven Space
          </span>
          {role ? (
            <span className="block truncate text-xs font-medium text-muted">
              {ROLE_LABEL[role] ?? role}
            </span>
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Role navigation.
 *
 * Desktop (`lg`+): a pinned, collapsible rail — `.chrome-sidebar` is a heavier
 * material than the topbar's because it is structural, not floating.
 *
 * Below `lg` the rail is hidden and the same list lives in a slide-over drawer
 * opened from the topbar's menu button. The drawer is a plain `div` (never a
 * second `aside`) so the shell keeps exactly one sidebar landmark.
 */
export function Sidebar({
  nav,
  mobileOpen = false,
  onMobileClose,
}: {
  nav: NavItem[];
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close the drawer whenever the route changes underneath it.
  useEffect(() => {
    onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector<HTMLElement>('a[href], button')?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onMobileClose?.();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* Pinned at `lg` so the rail can't be scrolled away: `lg:h-screen` gives the `nav`
          a bounded height to scroll in. The page stays the scroll container (no ancestor
          may set `overflow`). */}
      <aside
        className={`chrome-sidebar hidden shrink-0 flex-col border-r border-border transition-[width] duration-200 ease-[var(--ease-settle)] motion-reduce:transition-none lg:sticky lg:top-0 lg:flex lg:h-screen ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <div
          className={`flex h-16 items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}
        >
          <Brand collapsed={collapsed} role={user?.role} />
        </div>
        <nav aria-label="Primary" className="flex-1 overflow-y-auto py-3">
          <NavList nav={nav} collapsed={collapsed} />
        </nav>
        <div className={`border-t border-border p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(v => !v)}
            className={`flex h-9 items-center gap-2 rounded-lg text-sm text-gray-ink transition-colors hover:bg-subtle hover:text-ink ${
              collapsed ? 'w-9 justify-center' : 'w-full px-3'
            }`}
          >
            <Icon
              name="chevronLeft"
              size={16}
              className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            />
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            className="modal-fade absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
            onClick={onMobileClose}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="drawer-in absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col bg-surface shadow-pop"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <Brand collapsed={false} role={user?.role} />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={onMobileClose}
                className="-mr-2 rounded-full p-2 text-gray-ink hover:bg-subtle"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <nav aria-label="Primary" className="flex-1 overflow-y-auto py-3">
              <NavList nav={nav} collapsed={false} onNavigate={onMobileClose} />
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

export type { NavItem };
