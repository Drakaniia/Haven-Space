import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { BillingRulesCard } from './BillingRulesCard';
import { PaymentFilters, emptyFilters, type TrackerFilterState } from './PaymentFilters';
import { PaymentSummaryCards } from './PaymentSummaryCards';
import { PaymentTrackerTable } from './PaymentTrackerTable';
import { RecordPaymentModal } from './RecordPaymentModal';
import { StatusLegend } from './StatusLegend';
import { Button, buttonClasses } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Field, SelectInput, TextArea, TextInput } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../ui/PageHeader';
import { Spinner } from '../ui/Spinner';
import { ToastStack, useToasts } from '../ui/Toast';
import { getProperties } from '../../lib/api/landlord';
import {
  createLandlordCharge,
  fetchLandlordPaymentsCsv,
  getBillingSettings,
  getPaymentTracker,
  rejectLandlordSubmission,
  sendPaymentReminder,
  updateBillingSettings,
  updateNextDueDate,
  verifyLandlordSubmission,
} from '../../lib/api/payments';
import { useAuth } from '../../lib/auth-context';
import { PAYMENTS_ERROR_HINT } from '../../lib/payments';
import type { TrackerRow } from '../../lib/types';

/**
 * The monthly boarder payment tracker (spec `payments-tracker-redesign` §7.1).
 *
 * One row per boarder instead of one row per charge, money summary cards that
 * double as filters, URL-carried search, an in-row history, and the billing rules
 * that decide what "overdue" and "late fee" mean for the selected property.
 */
function useTrackerFilters(month: string): [TrackerFilterState, (next: TrackerFilterState) => void] {
  const location = useLocation() as unknown as { searchStr?: string; href?: string };
  const navigate = useNavigate();

  const fromUrl = useMemo(() => {
    const raw =
      typeof location.searchStr === 'string'
        ? location.searchStr
        : (location.href ?? '').split('?')[1] ?? '';
    const params = new URLSearchParams(raw);

    return {
      ...emptyFilters(params.get('month') ?? month),
      propertyId: params.get('propertyId') ?? '',
      roomId: params.get('roomId') ?? '',
      status: params.get('status') ?? '',
      dueFrom: params.get('dueFrom') ?? '',
      dueTo: params.get('dueTo') ?? '',
      overdue: params.get('overdue') === '1',
      needsReview: params.get('needsReview') === '1',
      search: params.get('q') ?? '',
    };
  }, [location.searchStr, location.href, month]);

  const [filters, setFilters] = useState<TrackerFilterState>(fromUrl);

  const update = (next: TrackerFilterState) => {
    setFilters(next);

    const params = new URLSearchParams();

    if (next.propertyId) params.set('propertyId', next.propertyId);
    if (next.month) params.set('month', next.month);
    if (next.roomId) params.set('roomId', next.roomId);
    if (next.status) params.set('status', next.status);
    if (next.dueFrom) params.set('dueFrom', next.dueFrom);
    if (next.dueTo) params.set('dueTo', next.dueTo);
    if (next.overdue) params.set('overdue', '1');
    if (next.needsReview) params.set('needsReview', '1');
    if (next.search) params.set('q', next.search);

    void navigate({
      to: '/landlord/payments',
      search: Object.fromEntries(params) as never,
    });
  };

  return [filters, update];
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function PaymentsTrackerPage() {
  const { token } = useAuth();
  const { toasts, push, dismiss } = useToasts();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useTrackerFilters(currentMonth());
  const [recording, setRecording] = useState<TrackerRow | null>(null);
  const [pageRecording, setPageRecording] = useState(false);
  const [addingCharge, setAddingCharge] = useState(false);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const properties = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: () => getProperties(token!),
    enabled: Boolean(token),
  });

  const propertyList = properties.data?.data.properties ?? [];
  const activePropertyId = filters.propertyId
    ? Number(filters.propertyId)
    : propertyList[0]?.id ?? null;

  const tracker = useQuery({
    queryKey: ['payment-tracker', activePropertyId, filters],
    queryFn: () =>
      getPaymentTracker(token!, {
        propertyId: activePropertyId,
        month: filters.month || null,
        roomId: filters.roomId ? Number(filters.roomId) : null,
        status: filters.status || null,
        dueFrom: filters.dueFrom || null,
        dueTo: filters.dueTo || null,
        overdue: filters.overdue,
        needsReview: filters.needsReview,
        search: filters.search || null,
      }),
    enabled: Boolean(token),
  });

  const settings = useQuery({
    queryKey: ['landlord-billing-settings', activePropertyId],
    queryFn: () => getBillingSettings(token!, activePropertyId!),
    enabled: Boolean(token && activePropertyId),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['payment-tracker'] });
    void queryClient.invalidateQueries({ queryKey: ['payment-history'] });
    void queryClient.invalidateQueries({ queryKey: ['landlord-billing-settings'] });
    void queryClient.invalidateQueries({ queryKey: ['landlord-dashboard'] });
  };

  const remind = useMutation({
    mutationFn: (row: TrackerRow) => sendPaymentReminder(token!, row.current_charge_id!),
    onSuccess: () => {
      push({ tone: 'success', message: 'Reminder sent' });
      refresh();
    },
    onError: error => push({ tone: 'error', message: error.message }),
  });

  const nextDue = useMutation({
    mutationFn: ({ row, date }: { row: TrackerRow; date: string }) =>
      updateNextDueDate(token!, row.application_id, { next_due_date: date }),
    onSuccess: () => {
      push({ tone: 'success', message: 'Next due date updated' });
      refresh();
    },
    onError: error => push({ tone: 'error', message: error.message }),
  });

  const verify = useMutation({
    mutationFn: (submissionId: number) => verifyLandlordSubmission(token!, submissionId),
    onSuccess: () => {
      push({ tone: 'success', message: 'Payment verified' });
      refresh();
    },
    onError: error => push({ tone: 'error', message: error.message }),
  });

  const reject = useMutation({
    mutationFn: () => rejectLandlordSubmission(token!, rejecting!, rejectReason.trim()),
    onSuccess: () => {
      push({ tone: 'success', message: 'Payment rejected' });
      setRejecting(null);
      setRejectReason('');
      refresh();
    },
    onError: error => push({ tone: 'error', message: error.message }),
  });

  const saveSettings = useMutation({
    mutationFn: (input: Parameters<typeof updateBillingSettings>[2]) =>
      updateBillingSettings(token!, activePropertyId!, input),
    onSuccess: () => {
      push({ tone: 'success', message: 'Billing rules saved' });
      refresh();
    },
    onError: error => push({ tone: 'error', message: error.message }),
  });

  const exportCsv = useMutation({
    mutationFn: () =>
      fetchLandlordPaymentsCsv(token!, { propertyId: activePropertyId, month: filters.month }),
    onSuccess: csv => {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payments-${filters.month || 'all'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      push({ tone: 'success', message: 'Export ready' });
    },
    onError: error => push({ tone: 'error', message: error.message }),
  });

  const rows = tracker.data?.data.rows ?? [];
  const summary = tracker.data?.data.summary ?? {
    expected: 0,
    paid: 0,
    due_today: 0,
    in_grace: 0,
    overdue: 0,
  };
  const hasFilters = Boolean(
    filters.roomId ||
      filters.status ||
      filters.dueFrom ||
      filters.dueTo ||
      filters.overdue ||
      filters.needsReview ||
      filters.search
  );
  const nothingBilled = rows.length > 0 && rows.every(row => row.status === 'no_charge');
  const exampleBase = rows[0]?.monthly_rent ?? 6500;

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <PageHeader
        title="Payments"
        icon="payment"
        actions={
          <>
            <Button
              variant="outline"
              disabled={exportCsv.isPending}
              onClick={() => exportCsv.mutate()}
            >
              {exportCsv.isPending ? 'Exporting…' : 'Export CSV'}
            </Button>
            <Button onClick={() => setPageRecording(true)}>Record a payment</Button>
            <Button variant="ghost" onClick={() => setAddingCharge(true)}>
              Add a charge
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-5">
        <PaymentFilters
          properties={propertyList.map(property => ({ id: property.id, name: property.name }))}
          value={filters}
          onChange={setFilters}
          onClear={() => setFilters(emptyFilters(currentMonth()))}
        />

        {tracker.isLoading ? (
          <Spinner />
        ) : tracker.error ? (
          <ErrorState
            message={tracker.error.message}
            hint={PAYMENTS_ERROR_HINT}
            action={
              <Button variant="outline" onClick={() => void tracker.refetch()}>
                Try again
              </Button>
            }
          />
        ) : (
          <>
            <PaymentSummaryCards
              summary={summary}
              rows={rows}
              activeStatus={filters.status || null}
              onSelect={status => setFilters({ ...filters, status: status ?? '' })}
            />

            {rows.length === 0 ? (
              // D24: the two causes read differently — nothing billed in this
              // month/property at all, versus filters that match nothing.
              hasFilters ? (
                <EmptyState
                  icon="search"
                  title="Nothing matches these filters"
                  description="No boarder has a rent cycle that fits the room, status, due-date or search filters you applied."
                  action={
                    <Button
                      variant="outline"
                      onClick={() => setFilters(emptyFilters(currentMonth()))}
                    >
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon="payment"
                  title="No boarders to bill this month"
                  description="Only boarders with a rent cycle due or paid in the selected month are listed. Rent cycles are created when a booking is confirmed — a one-off charge can be added to a tenant at any time."
                  action={
                    <Link
                      to="/landlord/boarders"
                      className={buttonClasses({ variant: 'outline' })}
                    >
                      See your tenants
                    </Link>
                  }
                />
              )
            ) : (
              <>
                {nothingBilled ? (
                  <p className="text-sm text-gray-ink">
                    No active charges for this month — every boarder here is settled or not billed
                    yet.
                  </p>
                ) : null}
                <PaymentTrackerTable
                  token={token!}
                  rows={rows}
                  busy={remind.isPending || reject.isPending}
                  onRecord={row => setRecording(row)}
                  onRemind={row => remind.mutate(row)}
                  onNextDue={(row, date) => nextDue.mutate({ row, date })}
                  onVerify={submissionId => verify.mutate(submissionId)}
                  onReject={submissionId => {
                    setRejecting(submissionId);
                    setRejectReason('');
                  }}
                  onError={message => push({ tone: 'error', message })}
                />
              </>
            )}

            <StatusLegend />
          </>
        )}

        {settings.data ? (
          <BillingRulesCard
            settings={settings.data.data}
            saving={saveSettings.isPending}
            exampleBase={exampleBase}
            onSave={input => saveSettings.mutate(input)}
          />
        ) : null}
      </div>

      <RecordPaymentModal
        token={token!}
        open={Boolean(recording) || pageRecording}
        boarders={rows.map(row => ({
          application_id: row.application_id,
          boarder_name: row.boarder_name,
        }))}
        initialApplicationId={recording?.application_id ?? null}
        onClose={() => {
          setRecording(null);
          setPageRecording(false);
        }}
        onRecorded={message => {
          push({ tone: 'success', message });
          refresh();
        }}
        onError={message => push({ tone: 'error', message })}
      />

      <AddChargeModal
        open={addingCharge}
        rows={rows}
        token={token!}
        propertyId={activePropertyId}
        onClose={() => setAddingCharge(false)}
        onCreated={message => {
          push({ tone: 'success', message });
          refresh();
        }}
        onError={message => push({ tone: 'error', message })}
      />

      <Modal open={rejecting !== null} title="Reject this payment?" onClose={() => setRejecting(null)}>
        <p className="text-sm text-gray-ink">
          The boarder will be told why, and the charge returns to the open ledger so they can submit
          again.
        </p>
        <div className="mt-4">
          <Field label="Reason" htmlFor="rejection_reason">
            <TextArea
              id="rejection_reason"
              rows={3}
              value={rejectReason}
              onChange={event => setRejectReason(event.target.value)}
              placeholder="e.g. No transfer matching this reference number"
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRejecting(null)}>
            Keep reviewing
          </Button>
          <Button
            variant="danger"
            disabled={reject.isPending || !rejectReason.trim()}
            onClick={() => reject.mutate()}
          >
            {reject.isPending ? 'Rejecting…' : 'Reject payment'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

/** Utilities and ad-hoc charges stay page-level (D18) and land in the row's history. */
function AddChargeModal({
  open,
  rows,
  token,
  propertyId,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean;
  rows: TrackerRow[];
  token: string;
  propertyId: number | null;
  onClose: () => void;
  onCreated: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [boarderId, setBoarderId] = useState('');
  const [chargeType, setChargeType] = useState('utility');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  const create = useMutation({
    mutationFn: () =>
      createLandlordCharge(token, propertyId!, {
        boarder_id: Number(boarderId || rows[0]?.boarder_id),
        charge_type: chargeType,
        amount: Number(amount),
        due_date: dueDate,
        description: description || (chargeType === 'utility' ? 'Utilities' : 'Additional charge'),
      }),
    onSuccess: () => {
      onCreated('Charge added');
      setAmount('');
      setDescription('');
      onClose();
    },
    onError: error => onError(error.message),
  });

  const canSubmit = Boolean(propertyId) && rows.length > 0 && Number(amount) > 0 && Boolean(dueDate);

  return (
    <Modal open={open} title="Add a charge" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Boarder" htmlFor="charge-boarder">
          <SelectInput
            id="charge-boarder"
            value={boarderId || String(rows[0]?.boarder_id ?? '')}
            onChange={event => setBoarderId(event.target.value)}
          >
            {rows.map(row => (
              <option key={row.boarder_id} value={row.boarder_id}>
                {row.boarder_name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="charge-type">
            <SelectInput
              id="charge-type"
              value={chargeType}
              onChange={event => setChargeType(event.target.value)}
            >
              <option value="utility">Utilities</option>
              <option value="other">Other charge</option>
            </SelectInput>
          </Field>

          <Field label="Amount (₱)" htmlFor="charge-amount">
            <TextInput
              id="charge-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={event => setAmount(event.target.value)}
            />
          </Field>

          <Field label="Due date" htmlFor="charge-due">
            <TextInput
              id="charge-due"
              type="date"
              value={dueDate}
              onChange={event => setDueDate(event.target.value)}
            />
          </Field>

          <Field label="Description" htmlFor="charge-description">
            <TextInput
              id="charge-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
            />
          </Field>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-ink">
            A charge belongs to a boarder, so this needs at least one confirmed tenant.
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSubmit || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Adding…' : `Add charge`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
