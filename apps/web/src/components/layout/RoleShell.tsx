import type { ReactNode } from 'react';
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
  return (
    <div className="flex min-h-screen bg-cream">
      {nav.length > 0 && <Sidebar nav={nav} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-6 pb-16 pt-6 lg:px-10">
          <div className="mx-auto max-w-[1280px]">
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
