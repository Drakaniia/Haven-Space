import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { PlaceholderPage } from '../../components/ui/PlaceholderPage';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/activity')({
  component: () => (
    <Protected role="landlord">
      <RoleShell nav={LANDLORD_NAV}>
        <PlaceholderPage
          icon="analytics"
          title="Activity"
          message="An activity feed will appear here once the landlord activity endpoint is finalized."
        />
      </RoleShell>
    </Protected>
  ),
});
