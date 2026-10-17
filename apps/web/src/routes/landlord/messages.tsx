import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { LANDLORD_NAV } from '../../lib/nav';

/**
 * Layout for the `/landlord/messages` subtree (spec `messages-feature-review`
 * D14/R16): the inbox is the index child and an open thread is its own route, so
 * a conversation deep-links at every screen size.
 */
export const Route = createFileRoute('/landlord/messages')({
  component: () => (
    <Protected role="landlord">
      <RoleShell nav={LANDLORD_NAV}>
        <Outlet />
      </RoleShell>
    </Protected>
  ),
});
