import { useQuery } from '@tanstack/react-query';

import { MessageComposer } from '../messages/MessageComposer';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { openThread, sendMessage, uploadMessageAttachments } from '../../lib/api/messages';

/**
 * Sends a real message without leaving Payments (spec
 * `landlord-payments-monitoring` §11, D8).
 *
 * It reuses `MessageComposer` and `MessageThread`'s exact send sequence — upload
 * the images first, then store the message — so a failed upload can never leave a
 * half-written message behind. Opening the thread is idempotent per pair, which
 * is why this can simply be done on open.
 */
export function MessageTenantModal({
  token,
  open,
  boarderId,
  propertyId,
  title,
  initialBody,
  note,
  onClose,
  onSent,
}: {
  token: string;
  open: boolean;
  boarderId: number;
  propertyId: number | null;
  title: string;
  initialBody: string;
  /** A quiet line above the composer, e.g. the last reminder date. */
  note?: string | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const thread = useQuery({
    queryKey: ['message-thread-open', boarderId, propertyId],
    queryFn: () =>
      openThread(token, {
        counterpart_id: boarderId,
        ...(propertyId ? { property_id: propertyId } : {}),
      }),
    enabled: open && Boolean(token && boarderId),
    staleTime: Infinity,
  });

  const threadId = thread.data?.data.thread.id ?? null;

  async function send({ text, files }: { text: string; files: File[] }) {
    if (!threadId) {
      throw new Error('That conversation could not be opened.');
    }

    const attachments =
      files.length > 0 ? (await uploadMessageAttachments(token, files)).data : [];

    await sendMessage(token, threadId, {
      body: text,
      attachments,
      ...(propertyId ? { property_id: propertyId } : {}),
    });

    onSent();
    onClose();
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      {thread.error ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-error-ink">{thread.error.message}</p>
          <Button variant="outline" size="sm" onClick={() => void thread.refetch()}>
            Try again
          </Button>
        </div>
      ) : thread.isLoading || !threadId ? (
        <Spinner />
      ) : (
        <>
          {note ? <p className="mb-3 text-xs text-gray-ink">{note}</p> : null}
          <MessageComposer key={initialBody} initialText={initialBody} autoFocus onSend={send} />
        </>
      )}
    </Modal>
  );
}
