import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { acceptInvitation, getInvitations, rejectInvitation } from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';
import type { LandlordInvitation } from '../../lib/types';

export const Route = createFileRoute('/landlord/invitations')({
  component: () => (
    <Protected role="landlord">
      <InvitationsPage />
    </Protected>
  ),
});

function formatWhen(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function InvitationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const invitations = useQuery({
    queryKey: ['landlord-invitations'],
    queryFn: () => getInvitations(token!),
    enabled: Boolean(token),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['landlord-invitations'] });
  };

  const accept = useMutation({
    mutationFn: (invitationId: number) => acceptInvitation(token!, invitationId),
    onSuccess: result => {
      setNotice(result.message);
      setError('');
      refresh();
      void queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
    },
    onError: (acceptError: Error) => {
      setError(acceptError.message);
      setNotice('');
    },
  });

  const reject = useMutation({
    mutationFn: (invitationId: number) => rejectInvitation(token!, invitationId),
    onSuccess: result => {
      setNotice(result.message);
      setError('');
      refresh();
    },
    onError: (rejectError: Error) => {
      setError(rejectError.message);
      setNotice('');
    },
  });

  const pending = invitations.data?.data.invitations.filter(
    invitation => invitation.status === 'pending'
  );
  const history = invitations.data?.data.invitations.filter(
    invitation => invitation.status !== 'pending'
  );
  const busy = accept.isPending || reject.isPending;

  return (
    <RoleShell title="Invitations" nav={LANDLORD_NAV}>
      <div className="mb-5 flex items-center gap-3">
        <Icon name="document" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-ink">Invitations</h2>
          <p className="text-sm text-gray-ink">
            Property access invitations sent to you by the Haven Space Admin.
          </p>
        </div>
      </div>

      {notice ? (
        <div className="mb-4 rounded-md border border-mint bg-mint/40 px-4 py-2 text-sm">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {invitations.isLoading ? (
        <Spinner />
      ) : invitations.error ? (
        <ErrorState message={invitations.error.message} />
      ) : (
        <>
          <h3 className="mb-3 font-semibold text-ink">Pending</h3>
          {pending && pending.length > 0 ? (
            <div className="space-y-4">
              {pending.map(invitation => (
                <PendingInvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  busy={busy}
                  onAccept={() => accept.mutate(invitation.id)}
                  onReject={() => reject.mutate(invitation.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No pending invitations" />
          )}

          <h3 className="mb-3 mt-8 font-semibold text-ink">Past invitations</h3>
          {history && history.length > 0 ? (
            <div className="space-y-3">
              {history.map(invitation => (
                <Card
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-ink">{invitation.property_name}</p>
                    <p className="text-sm text-gray-ink">
                      Owner: {invitation.owner_name} · sent {formatWhen(invitation.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={invitation.status} />
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-ink">No past invitations.</p>
          )}
        </>
      )}
    </RoleShell>
  );
}

function PendingInvitationCard({
  invitation,
  busy,
  onAccept,
  onReject,
}: {
  invitation: LandlordInvitation;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium text-ink">{invitation.property_name}</p>
        <p className="text-sm text-gray-ink">
          Owner: {invitation.owner_name} ({invitation.owner_email}) · sent{' '}
          {formatWhen(invitation.created_at)}
        </p>
        <p className="mt-1 text-sm text-gray-ink">
          Accepting gives you access to this property's rooms, tenants, and payments. The property
          remains owned by {invitation.owner_name}.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onReject}>
          Reject
        </Button>
        <Button type="button" disabled={busy} onClick={onAccept}>
          {busy ? 'Working…' : 'Accept'}
        </Button>
      </div>
    </Card>
  );
}
