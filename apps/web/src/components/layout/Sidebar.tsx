import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
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

export function Sidebar({ nav }: { nav: NavItem[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  // The unread total rides on the Messages item itself rather than on a
  // `NavItem` field: the nav lists are shared constants, and one shared query
  // keeps the badge and the inbox in sync (spec `messages-feature-review` R9).
  const messagesItemPath = messagesPath(user?.role);
  const unread = useUnreadMessages(user?.role === 'boarder' || user?.role === 'landlord');

  const groups = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const item of nav) {
      const key = item.group ?? 'Main';
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [nav]);

  // Pinned at `lg` so the sidebar can't be scrolled away: `lg:h-screen` is what gives the `nav`
  // below a bounded height to actually scroll in. Gated at `lg` to leave the sub-`lg` rail
  // untouched, and the page stays the scroll container (no ancestor may set `overflow`).
  //
  // `.chrome-sidebar` is a heavier material than the topbar's: material weight encodes hierarchy,
  // and this is a structural region rather than floating chrome — hence it keeps its hairline
  // border while the topbar uses a scroll edge instead.
  return (
    <aside
      className={`chrome-sidebar flex shrink-0 flex-col border-r border-border transition-[width] lg:sticky lg:top-0 lg:h-screen ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed ? (
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/assets/images/Haven_Space_Logo.png"
              alt=""
              className="h-8 w-8 object-contain"
            />
            <span className="font-bold text-primary">Haven Space</span>
          </Link>
        ) : (
          <img
            src="/assets/images/Haven_Space_Logo.png"
            alt=""
            className="h-8 w-8 object-contain"
          />
        )}
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed(v => !v)}
          className="rounded p-1 hover:bg-mint"
        >
          <Icon
            name="chevronDown"
            size={16}
            className={`transition-transform ${collapsed ? '' : 'rotate-180'}`}
          />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {groups.map(([group, items]) => (
          <div key={group} className="mb-6 px-3">
            {!collapsed ? (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {group}
              </p>
            ) : null}
            <div className="space-y-1">
              {items.map(item => {
                const unreadCount = item.to === messagesItemPath ? unread : 0;

                return (
                  <Link
                    // `to` alone is not unique root-wide: admin's eight sections all sit on
                    // `/admin` and differ only by search (`admin-apple-ui-restructure` R7).
                    key={`${item.to}${item.search ? `?${searchKey(item.search)}` : ''}`}
                    to={item.to}
                    // `Link` matches on search by default (`activeOptions.includeSearch ?? true`),
                    // so passing `search` is enough to keep exactly one section active at a time.
                    // Undefined for every other role, which leaves their matching untouched (D20).
                    search={item.search}
                    // `Link` already emits `aria-current="page"` on the active item (R43) and
                    // merges `activeProps.className` with the base classes rather than replacing them.
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-ink transition-all duration-100 ease-out hover:bg-mint/50 active:scale-[0.98] motion-reduce:transition-none"
                    activeProps={{ className: 'bg-mint font-semibold text-primary' }}
                  >
                    <Icon name={item.icon} size={20} className="shrink-0" />
                    {!collapsed ? <span>{item.label}</span> : null}
                    {unreadCount > 0 ? (
                      collapsed ? (
                        <span
                          aria-hidden="true"
                          className="ml-auto h-2 w-2 rounded-full bg-error"
                        />
                      ) : (
                        <span
                          aria-label={`${unreadCount} unread ${
                            unreadCount === 1 ? 'message' : 'messages'
                          }`}
                          className="ml-auto rounded-full bg-error px-1.5 text-[11px] font-bold text-white"
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
      </nav>
    </aside>
  );
}

export type { NavItem };
