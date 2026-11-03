import { createFileRoute, Link } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { buttonClasses } from '../../components/ui/Button';
import { PlaceholderPage } from '../../components/ui/PlaceholderPage';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/maintenance')({
  component: () => (
    <Protected role="landlord">
      <RoleShell nav={LANDLORD_NAV}>
        <PlaceholderPage
          icon="kitchen"
          title="Maintenance requests"
          notice="Maintenance tracking is not built yet."
          message="Requests from boarders will be listed here once maintenance tracking ships. Until then, coordinate repairs through Messages."
          action={
            <Link
              to="/landlord/messages"
              className={buttonClasses({ variant: 'outline', size: 'sm' })}
            >
              Go to Messages
            </Link>
          }
        />
      </RoleShell>
    </Protected>
  ),
});
