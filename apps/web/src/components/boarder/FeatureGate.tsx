import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useBoarderStatus } from '../../lib/use-boarder-nav';
import { EmptyState } from '../ui/EmptyState';

/**
 * Placeholder rendered on routes that only make sense once a tenancy is
 * confirmed (spec R7): an `EmptyState` inside the normal boarder shell with a
 * CTA back to Applications. Gating is purely visual — the route still renders
 * so the sidebar/topbar stay intact.
 */
export function FeatureGate() {
  return (
    <div className="mx-auto max-w-md py-8 text-center">
      <EmptyState
        title="Not available yet"
        description="This becomes available once your booking is confirmed and your tenancy starts."
      />
      <Link
        to="/boarder/applications"
        className="mt-4 inline-block rounded-full bg-primary-strong px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        Go to Applications
      </Link>
    </div>
  );
}

/**
 * Renders `children` only for boarders with a confirmed tenancy; everyone
 * else gets the `FeatureGate` screen (spec R7/R11). The caller's `RoleShell`
 * stays mounted either way, so the sidebar and topbar remain visible.
 */
export function RequireTenancy({ children }: { children: ReactNode }) {
  const status = useBoarderStatus();
  if (status === 'confirmed') return <>{children}</>;
  return <FeatureGate />;
}
