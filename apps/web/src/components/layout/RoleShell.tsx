import { useCallback, useState, type ReactNode } from 'react';
import { Sidebar, type NavItem } from './Sidebar';
import { Topbar } from './Topbar';
import { RestrictionBanner } from '../shared/RestrictionBanner';

/**
 * Role shell: pinned sidebar, floating topbar, one scrolling content column.
 *
 * No `title` prop — the topbar carries breadcrumbs and each page names itself
 * with a `PageHeader` (`landlord-apple-ui-restructure` D7/D10/R8).
 *
 * The right column must never gain an `overflow` value and neither may any
 * ancestor: `main` has to stay part of the page's own scroll container, or the
 * `lg:sticky` pins on the sidebar and the topbar silently stop working.
 */
export function RoleShell({
  nav = [],
  children,
  onboardingIncomplete,
  onboardingSkipped,
}: {
  nav?: NavItem[];
  children: ReactNode;
  onboardingIncomplete?: boolean;
  onboardingSkipped?: boolean;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const hasNav = nav.length > 0;

  return (
    <div className="flex min-h-screen bg-cream">
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {hasNav && <Sidebar nav={nav} mobileOpen={navOpen} onMobileClose={closeNav} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={hasNav ? () => setNavOpen(true) : undefined} />
        <main id="main-content" className="flex-1 px-4 pb-20 pt-6 sm:px-6 lg:px-10 lg:pt-8">
          <div className="mx-auto max-w-[1240px]">
            <RestrictionBanner
              isIncomplete={onboardingIncomplete}
              isSkipped={onboardingSkipped}
              onCompleteProfile={() => (window.location.href = '/onboarding')}
            />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
