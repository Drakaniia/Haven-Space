import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { LandlordCalendar } from '../../components/calendar/LandlordCalendar';
import { RoleShell } from '../../components/layout/RoleShell';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/calendar')({
  component: () => (
    <Protected role="landlord">
      <RoleShell nav={LANDLORD_NAV}>
        <LandlordCalendar />
      </RoleShell>
    </Protected>
  ),
});
