import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import type { NavItem } from '../../lib/nav';
import { Icon } from '../ui/Icon';

export function Sidebar({ nav }: { nav: NavItem[] }) {
  const [collapsed, setCollapsed] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const item of nav) {
      const key = item.group ?? 'Main';
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [nav]);

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
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
              {items.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-mint/50"
                  activeProps={{ className: 'bg-mint font-semibold text-primary' }}
                >
                  <Icon name={item.icon} size={20} className="shrink-0" />
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export type { NavItem };
