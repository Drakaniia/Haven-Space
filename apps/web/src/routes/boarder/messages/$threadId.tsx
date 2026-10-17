import { createFileRoute } from '@tanstack/react-router';
import { MessageInbox } from '../../../components/messages/MessageInbox';

export const Route = createFileRoute('/boarder/messages/$threadId')({
  /**
   * `?draft=<propertyId>` prefills the composer when the CTA came from a listing
   * (§4.4). Non-throwing: an unparseable value just opens the thread.
   */
  validateSearch: (search: Record<string, unknown>): { draft?: number } => {
    const draft = Number(search.draft);

    return Number.isInteger(draft) && draft > 0 ? { draft } : {};
  },
  component: BoarderThreadPage,
});

function BoarderThreadPage() {
  const { threadId } = Route.useParams();
  const { draft } = Route.useSearch();

  return <MessageInbox role="boarder" threadId={Number(threadId)} draftPropertyId={draft ?? null} />;
}
