import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { useBoarderNav } from '../../lib/use-boarder-nav';

/**
 * Layout for the `/boarder/messages` subtree (spec `messages-feature-review`
 * D12/D14).
 *
 * No `RequireTenancy`: the listing's *Contact Landlord* CTA is reachable by a
 * boarder who has never applied, so a confirmed tenancy cannot be the gate (F4).
 * Everyone else on the surface keeps their existing gates.
 */
export const Route = createFileRoute('/boarder/messages')({
  component: BoarderMessagesLayout,
});

function BoarderMessagesLayout() {
  const nav = useBoarderNav();

  return (
    <Protected role="boarder">
      <RoleShell nav={nav}>
        <Outlet />
      </RoleShell>
    </Protected>
  );
}
