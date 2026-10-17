import { createFileRoute } from '@tanstack/react-router';
import { PaymentsTrackerPage } from '../../../components/payments/PaymentsTrackerPage';

// The shell (Protected + RoleShell) lives in `landlord/payments.tsx`; a leaf that
// renders its own double-nests the sidebar and topbar (spec `payments-page-regressions`).
export const Route = createFileRoute('/landlord/payments/')({
  component: PaymentsTrackerPage,
});
