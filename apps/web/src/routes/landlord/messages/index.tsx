import { createFileRoute } from '@tanstack/react-router';
import { MessageInbox } from '../../../components/messages/MessageInbox';

export const Route = createFileRoute('/landlord/messages/')({
  /**
   * `?compose=<propertyId>` is how a landlord is reached from a surface that is
   * not the inbox. Non-throwing: an unparseable value simply opens the list.
   */
  validateSearch: (search: Record<string, unknown>): { compose?: number } => {
    const compose = Number(search.compose);

    return Number.isInteger(compose) && compose > 0 ? { compose } : {};
  },
  component: LandlordInboxPage,
});

function LandlordInboxPage() {
  const { compose } = Route.useSearch();

  return <MessageInbox role="landlord" threadId={null} composePropertyId={compose ?? null} />;
}
