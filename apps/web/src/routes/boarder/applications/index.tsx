import { Link, createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { overallNextStep, formatApplicationDate } from '../../../components/boarder/applicationStatus';
import { Button, buttonClasses } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Icon } from '../../../components/ui/Icon';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ToastStack, useToasts } from '../../../components/ui/Toast';
import { ApiRequestError } from '../../../lib/api/http';
import { deleteApplication, getApplications } from '../../../lib/api/boarder';
import { useAuth } from '../../../lib/auth-context';
import { formatPeso } from '../../../lib/payments';
import { BROWSE_LISTINGS_PATH } from '../../../lib/routes';
import { BOARDER_STATUS_KEY } from '../../../lib/use-boarder-nav';
import type { ApplicationSummary } from '../../../lib/types';

export const Route = createFileRoute('/boarder/applications/')({
  component: ApplicationsPage,
});

const NEXT_STEP_STYLE = {
  action: { panel: 'border-primary/40 bg-mint/70', icon: 'bg-primary-strong text-white' },
  done: { panel: 'border-success-border bg-success-tint/70', icon: 'bg-success text-white' },
  waiting: { panel: 'border-border bg-surface', icon: 'bg-subtle text-gray-ink' },
  explore: { panel: 'border-border bg-surface', icon: 'bg-mint text-primary' },
} as const;

const NEXT_STEP_ICON = {
  action: 'check',
  done: 'home',
  waiting: 'clock',
  explore: 'search',
} as const;

function ApplicationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toasts, push, dismiss } = useToasts();
  const [confirmWithdraw, setConfirmWithdraw] = useState<ApplicationSummary | null>(null);
  const applications = useQuery({
    queryKey: ['applications'],
    queryFn: () => getApplications(token!),
    enabled: Boolean(token),
  });

  const withdraw = useMutation({
    mutationFn: (id: number) => deleteApplication(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      // Withdrawing can change boarder_status — keep the nav/gates fresh (R13).
      void queryClient.invalidateQueries({ queryKey: [BOARDER_STATUS_KEY] });
      setConfirmWithdraw(null);
      push({ tone: 'success', message: 'Application withdrawn.' });
    },
    onError: (err: Error) => {
      setConfirmWithdraw(null);
      push({
        tone: 'error',
        message: err instanceof ApiRequestError ? err.message : 'Failed to withdraw application.',
      });
    },
  });

  const rows = applications.data?.data ?? [];
  const sorted = [...rows].sort((left, right) => (left.created_at < right.created_at ? 1 : -1));

  return (
    <div>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        title="My applications"
        subtitle="Every room you've applied for, where each one stands, and what to do next."
        actions={
          <Link to={BROWSE_LISTINGS_PATH} className={buttonClasses({ variant: 'outline' })}>
            Find a room
          </Link>
        }
      />

      {applications.isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : applications.error ? (
        <ErrorState
          message={applications.error.message}
          action={
            <Button variant="outline" size="sm" onClick={() => void applications.refetch()}>
              Try again
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="application"
          title="No applications yet"
          description="Browse rooms and apply to start your journey. Each application you send is tracked here, from the landlord's reply to move-in day."
          action={
            <Link to={BROWSE_LISTINGS_PATH} className={buttonClasses()}>
              Browse rooms
            </Link>
          }
        />
      ) : (
        <>
          <NextStepPanel apps={rows} />

          <section aria-labelledby="applications-list" className="mt-10">
            <h2
              id="applications-list"
              className="mb-4 font-display text-[1.375rem] font-medium tracking-[-0.015em] text-ink"
            >
              All applications <span className="tabular text-gray-ink">({rows.length})</span>
            </h2>
            <Card padding="p-0">
              <ul className="divide-y divide-border/80">
                {sorted.map(row => (
                  <ApplicationRow
                    key={row.id}
                    row={row}
                    withdrawing={withdraw.isPending && withdraw.variables === row.id}
                    onWithdraw={() => setConfirmWithdraw(row)}
                  />
                ))}
              </ul>
            </Card>
          </section>
        </>
      )}

      <ConfirmDialog
        open={confirmWithdraw !== null}
        title="Withdraw this application?"
        message={
          confirmWithdraw
            ? `${confirmWithdraw.property_title ?? 'This landlord'} will no longer see your application${
                confirmWithdraw.status === 'accepted' ? ', and the room offer will be released' : ''
              }. You can apply again later if the room is still open.`
            : ''
        }
        confirmLabel="Withdraw"
        cancelLabel="Keep it"
        busy={withdraw.isPending}
        onConfirm={() => confirmWithdraw && withdraw.mutate(confirmWithdraw.id)}
        onCancel={() => setConfirmWithdraw(null)}
      />
    </div>
  );
}

function NextStepPanel({ apps }: { apps: ApplicationSummary[] }) {
  const { step, focus } = overallNextStep(apps);
  const style = NEXT_STEP_STYLE[step.tone];

  return (
    <section
      aria-labelledby="next-step-title"
      className={`flex flex-col gap-5 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${style.panel}`}
    >
      <div className="flex min-w-0 items-start gap-4">
        <span
          aria-hidden="true"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
        >
          <Icon name={NEXT_STEP_ICON[step.tone]} size={22} />
        </span>
        <div className="min-w-0">
          <p className="kicker">Next step</p>
          <h2
            id="next-step-title"
            className="mt-0.5 font-display text-[1.375rem] font-medium leading-tight tracking-[-0.015em] text-ink"
          >
            {step.title}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-gray-ink">{step.body}</p>
        </div>
      </div>
      <div className="shrink-0">
        {step.tone === 'action' && focus ? (
          <Link
            to="/boarder/applications/$id"
            params={{ id: String(focus.id) }}
            className={buttonClasses({ size: 'lg' })}
          >
            Confirm booking
          </Link>
        ) : step.tone === 'done' ? (
          <Link to="/boarder" className={buttonClasses({ size: 'lg' })}>
            Go to dashboard
          </Link>
        ) : step.tone === 'waiting' && focus ? (
          <Link
            to="/boarder/applications/$id"
            params={{ id: String(focus.id) }}
            className={buttonClasses({ variant: 'outline' })}
          >
            View application
          </Link>
        ) : (
          <Link to={BROWSE_LISTINGS_PATH} className={buttonClasses({ size: 'lg' })}>
            Browse rooms
          </Link>
        )}
      </div>
    </section>
  );
}

function ApplicationRow({
  row,
  withdrawing,
  onWithdraw,
}: {
  row: ApplicationSummary;
  withdrawing: boolean;
  onWithdraw: () => void;
}) {
  const canWithdraw = row.status === 'accepted' || row.status === 'pending';

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/boarder/applications/$id"
            params={{ id: String(row.id) }}
            className="truncate font-semibold text-ink underline-offset-4 hover:text-primary hover:underline"
          >
            {row.property_title ?? `Application #${row.id}`}
          </Link>
          <StatusBadge status={String(row.status)} />
        </div>
        <p className="tabular mt-1 text-sm text-gray-ink">
          {row.room_title ? `${row.room_title} · ` : ''}
          {row.room_price ? `${formatPeso(row.room_price)} / month · ` : ''}
          Applied {formatApplicationDate(row.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {row.status === 'accepted' ? (
          <Link
            to="/boarder/applications/$id"
            params={{ id: String(row.id) }}
            className={buttonClasses({ size: 'sm' })}
          >
            Confirm booking
          </Link>
        ) : (
          <Link
            to="/boarder/applications/$id"
            params={{ id: String(row.id) }}
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            View
          </Link>
        )}
        {canWithdraw ? (
          <Button
            type="button"
            variant="dangerGhost"
            size="sm"
            disabled={withdrawing}
            onClick={onWithdraw}
          >
            {withdrawing ? 'Withdrawing…' : 'Withdraw'}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
