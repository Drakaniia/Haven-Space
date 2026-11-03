import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/listings')({
  component: () => (
    <Protected role="landlord">
      <RoleShell nav={LANDLORD_NAV}>
        <Outlet />
      </RoleShell>
    </Protected>
  ),
});
