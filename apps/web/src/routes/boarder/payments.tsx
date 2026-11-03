import { createFileRoute, Outlet } from '@tanstack/react-router';
import { RequireTenancy } from '../../components/boarder/FeatureGate';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { useBoarderNav } from '../../lib/use-boarder-nav';

export const Route = createFileRoute('/boarder/payments')({
  component: PaymentsLayout,
});

function PaymentsLayout() {
  const nav = useBoarderNav();
  return (
    <Protected role="boarder">
      <RoleShell nav={nav}>
        <RequireTenancy>
          <Outlet />
        </RequireTenancy>
      </RoleShell>
    </Protected>
  );
}
