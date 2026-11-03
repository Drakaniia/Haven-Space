import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Icon } from '../../components/ui/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
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
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

function InvitationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pendingReject, setPendingReject] = useState<LandlordInvitation | null>(null);

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
      setPendingReject(null);
      refresh();
    },
    onError: (rejectError: Error) => {
      setError(rejectError.message);
      setNotice('');
      setPendingReject(null);
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
    <RoleShell nav={LANDLORD_NAV}>
      <PageHeader
        title="Invitations"
        subtitle="Property owners who asked you to help manage their boarding house."
      />

      {notice ? (
        <p
          role="status"
          className="mb-5 flex items-center gap-2.5 rounded-2xl border border-success-border bg-success-tint px-4 py-3 text-sm font-medium text-success-ink"
        >
          <Icon name="check" size={16} className="shrink-0" />
          {notice}
        </p>
      ) : null}
      {error ? (
        <div className="mb-5">
          <ErrorState message={error} />
        </div>
      ) : null}

      {invitations.isLoading ? (
        <Card>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-3 h-4 w-72" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
        </Card>
      ) : invitations.error ? (
        <ErrorState
          message={invitations.error.message}
          action={
            <Button variant="outline" size="sm" onClick={() => void invitations.refetch()}>
              Try again
            </Button>
          }
        />
      ) : (
        <>
          <section aria-labelledby="pending-invitations">
            <h2
              id="pending-invitations"
              className="mb-3 font-display text-xl font-medium tracking-[-0.015em] text-ink"
            >
              Waiting for your answer
            </h2>
            {pending && pending.length > 0 ? (
              <div className="flex flex-col gap-4">
                {pending.map(invitation => (
                  <PendingInvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    busy={busy}
                    accepting={accept.isPending && accept.variables === invitation.id}
                    onAccept={() => accept.mutate(invitation.id)}
                    onReject={() => setPendingReject(invitation)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="document"
                title="No pending invitations"
                description="When a property owner invites you to co-manage their property, the invitation shows up here for you to accept or decline."
              />
            )}
          </section>

          <section aria-labelledby="past-invitations" className="mt-12">
            <h2
              id="past-invitations"
              className="mb-3 font-display text-xl font-medium tracking-[-0.015em] text-ink"
            >
              Past invitations
            </h2>
            {history && history.length > 0 ? (
              <Card padding="p-0">
                <ul className="divide-y divide-border">
                  {history.map(invitation => (
                    <li
                      key={invitation.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{invitation.property_name}</p>
                        <p className="text-sm text-gray-ink">
                          From {invitation.owner_name} · sent {formatWhen(invitation.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={invitation.status} />
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <p className="text-sm text-gray-ink">
                No past invitations. Accepted and declined invitations are kept here.
              </p>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={pendingReject !== null}
        title="Decline this invitation?"
        message={
          <>
            You won&apos;t get access to <strong>{pendingReject?.property_name}</strong>.{' '}
            {pendingReject?.owner_name} would need to invite you again.
          </>
        }
        confirmLabel="Decline invitation"
        busy={reject.isPending}
        onConfirm={() => {
          if (pendingReject) reject.mutate(pendingReject.id);
        }}
        onCancel={() => setPendingReject(null)}
      />
    </RoleShell>
  );
}

function PendingInvitationCard({
  invitation,
  busy,
  accepting,
  onAccept,
  onReject,
}: {
  invitation: LandlordInvitation;
  busy: boolean;
  accepting: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <Card padding="p-0" className="overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint text-primary">
            <Icon name="building" size={22} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-medium tracking-[-0.01em] text-ink">
              {invitation.property_name}
            </p>
            <p className="mt-0.5 text-sm text-gray-ink">
              From {invitation.owner_name}{' '}
              <span className="text-muted">({invitation.owner_email})</span> · sent{' '}
              {formatWhen(invitation.created_at)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={onReject}>
            Decline
          </Button>
          <Button type="button" disabled={busy} onClick={onAccept}>
            {accepting ? 'Accepting…' : 'Accept'}
          </Button>
        </div>
      </div>
      <p className="border-t border-border bg-cream/60 px-5 py-3 text-sm text-gray-ink">
        Accepting gives you access to this property&apos;s rooms, tenants, and payments. The
        property remains owned by {invitation.owner_name}.
      </p>
    </Card>
  );
}
