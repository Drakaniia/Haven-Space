import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ApiRequestError } from '../../lib/api/http';
import { openThread } from '../../lib/api/messages';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../ui/Button';
import { ToastStack, useToasts } from '../ui/Toast';

/**
 * The shared "Message" action for entry points outside the inbox (D15/R17):
 * the application detail on both sides and the landlord's Tenants list.
 *
 * Opening a thread is idempotent, so tapping it again from another surface can
 * only ever land on the same conversation (R1).
 */
export function MessageButton({
  role,
  counterpartId,
  propertyId = null,
  label = 'Message',
  size = 'sm',
  variant = 'outline',
}: {
  role: 'landlord' | 'boarder';
  /** The other participant's user id — a landlord id for boarders, a boarder id for landlords. */
  counterpartId: number;
  propertyId?: number | null;
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'outline' | 'ghost';
}) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, push, dismiss } = useToasts();

  const open = useMutation({
    mutationFn: () =>
      openThread(token!, {
        counterpart_id: counterpartId,
        ...(propertyId ? { property_id: propertyId } : {}),
      }),
    onSuccess: response => {
      void queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      void queryClient.invalidateQueries({ queryKey: ['message-unread'] });
      void navigate({
        to: role === 'landlord' ? '/landlord/messages/$threadId' : '/boarder/messages/$threadId',
        params: { threadId: String(response.data.thread.id) },
      });
    },
    onError: failure =>
      push({
        tone: 'error',
        message:
          failure instanceof ApiRequestError
            ? failure.message
            : 'That conversation could not be opened.',
      }),
  });

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <Button variant={variant} size={size} disabled={open.isPending} onClick={() => open.mutate()}>
        {open.isPending ? 'Opening…' : label}
      </Button>
    </>
  );
}
