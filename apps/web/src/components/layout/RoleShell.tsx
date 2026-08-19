import type { ReactNode } from 'react';
import { Sidebar, type NavItem } from './Sidebar';
import { Topbar } from './Topbar';
import { RestrictionBanner } from '../shared/RestrictionBanner';

export function RoleShell({
  title,
  nav = [],
  children,
  onboardingIncomplete,
  onboardingSkipped,
}: {
  title: string;
  nav?: NavItem[];
  children: ReactNode;
  onboardingIncomplete?: boolean;
  onboardingSkipped?: boolean;
}) {
  return (
    <div className="flex min-h-screen bg-cream">
      {nav.length > 0 && <Sidebar nav={nav} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} />
        {/* soft scroll-edge fade under the floating topbar */}
        <div className="pointer-events-none sticky top-[57px] z-20 h-4 bg-gradient-to-b from-black/[0.04] to-transparent" />
        <main className="flex-1 px-6 pb-10 pt-2">
          <div className="mx-auto max-w-[1200px]">
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
