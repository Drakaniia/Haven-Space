import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { LANDLORD_NAV } from '../../lib/nav';

/**
 * Layout for the whole `/landlord/properties` subtree
 * (`landlord-property-detail-page` R5).
 *
 * The properties surface used to be a single leaf route. It now owns a property
 * detail page and a per-property rooms page, so the `Protected` + `RoleShell`
 * pair moves up here — the same shape the `/landlord/listings` subtree has had.
 */
export const Route = createFileRoute('/landlord/properties')({
  component: () => (
    <Protected role="landlord">
      <RoleShell nav={LANDLORD_NAV}>
        <Outlet />
      </RoleShell>
    </Protected>
  ),
});
