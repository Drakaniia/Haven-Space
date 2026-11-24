import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/landlord/listings/')({
  beforeLoad: () => {
    throw redirect({ to: '/landlord/properties', replace: true });
  },
  component: () => null,
});
