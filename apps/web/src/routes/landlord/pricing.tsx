import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { PlaceholderPage } from '../../components/ui/PlaceholderPage';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/pricing')({
  component: () => (
    <Protected role="landlord">
      <RoleShell nav={LANDLORD_NAV}>
        <PlaceholderPage
          icon="flag"
          title="Simple, Transparent Pricing"
          notice="Landlord Premium"
          message={
            <>
              <p>
                List unlimited properties, accept applications, and manage boarders with no credit
                card required. Cancel anytime.
              </p>
              <p>
                What&apos;s included: unlimited listings, application management, boarder
                management, announcements, and payment tracking.
              </p>
            </>
          }
        />
      </RoleShell>
    </Protected>
  ),
});
