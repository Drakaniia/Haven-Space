import { createFileRoute } from '@tanstack/react-router';
import { PaymentsMonitoringPage } from '../../../components/payments/PaymentsMonitoringPage';

// The shell (Protected + RoleShell) lives in `landlord/payments.tsx`; a leaf that
// renders its own double-nests the sidebar and topbar (spec `payments-page-regressions`).
// The page itself is the monitoring layout (spec `landlord-payments-monitoring`).
export const Route = createFileRoute('/landlord/payments/')({
  component: PaymentsMonitoringPage,
});
