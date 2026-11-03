import { createFileRoute } from '@tanstack/react-router';
import { MessageInbox } from '../../../components/messages/MessageInbox';

export const Route = createFileRoute('/boarder/messages/')({
  /**
   * `?compose=<propertyId>` is the listing's *Contact Landlord* destination: the
   * API resolves the landlord from the listing and returns the pair thread (R14).
   * Non-throwing: an unparseable value simply opens the list.
   */
  validateSearch: (search: Record<string, unknown>): { compose?: number } => {
    const compose = Number(search.compose);

    return Number.isInteger(compose) && compose > 0 ? { compose } : {};
  },
  component: BoarderInboxPage,
});

function BoarderInboxPage() {
  const { compose } = Route.useSearch();

  return <MessageInbox role="boarder" threadId={null} composePropertyId={compose ?? null} />;
}
