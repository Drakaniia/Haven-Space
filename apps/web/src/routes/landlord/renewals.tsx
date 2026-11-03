import { createFileRoute, Link } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { buttonClasses } from '../../components/ui/Button';
import { PlaceholderPage } from '../../components/ui/PlaceholderPage';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/renewals')({
  component: () => (
    <Protected role="landlord">
      <RoleShell nav={LANDLORD_NAV}>
        <PlaceholderPage
          icon="calendar"
          title="Lease renewals"
          notice="Renewal offers are not built yet."
          message="Lease renewals will be managed here once the offer flow ships. Tenancy dates already appear on the Calendar."
          action={
            <Link
              to="/landlord/calendar"
              className={buttonClasses({ variant: 'outline', size: 'sm' })}
            >
              Open calendar
            </Link>
          }
        />
      </RoleShell>
    </Protected>
  ),
});
