import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AddChargeModal } from './AddChargeModal';
import { MessageTenantModal } from './MessageTenantModal';
import { PaymentMetricsStrip } from './PaymentMetricsStrip';
import { PaymentMonitorFilters } from './PaymentMonitorFilters';
import { PaymentMonitorTable } from './PaymentMonitorTable';
import { RecordPaymentModal } from './RecordPaymentModal';
import { ReviewPaymentDrawer } from './ReviewPaymentDrawer';
import { TenantPaymentDrawer } from './TenantPaymentDrawer';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { ToastStack, useToasts } from '../ui/Toast';
import { getProperties } from '../../lib/api/landlord';
import { fetchLandlordPaymentsCsv, getPaymentTracker } from '../../lib/api/payments';
import { useAuth } from '../../lib/auth-context';
import {
  emptyMonitorFilters,
  formatPaymentDate,
  hasActiveFilters,
  matchesFilters,
  monitorMetrics,
  monthLabel,
  reminderMessage,
  type MonitorFilters,
} from '../../lib/payments';
import type { TrackerRow } from '../../lib/types';

/**
 * The landlord Payments monitor (spec `landlord-payments-monitoring`).
 *
 * One row per tenant for a chosen property and month, a review drawer for claims
 * that need a decision, and a tenant drawer for everything else. Property, month
 * and search are answered by the tracker endpoint; the remaining filters narrow
 * the returned rows so the four metrics always describe the table (RES-3).
 */
export function PaymentsMonitoringPage() {
  const { token } = useAuth();
  const { toasts, push, dismiss } = useToasts();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation() as unknown as { searchStr?: string; href?: string };

  const thisMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [filters, setFilters] = useState<MonitorFilters>(() =>
    readFilters(location.searchStr ?? (location.href ?? '').split('?')[1] ?? '', thisMonth)
  );
  const [panel, setPanel] = useState<
    | { kind: 'none' }
    | { kind: 'review'; chargeId: number; row: TrackerRow }
    | { kind: 'tenant'; row: TrackerRow }
  >({ kind: 'none' });
  const [composer, setComposer] = useState<{
    row: TrackerRow;
    title: string;
    body: string;
    note: string | null;
  } | null>(null);
  const [recording, setRecording] = useState<TrackerRow | null>(null);
  const [charging, setCharging] = useState<TrackerRow | null>(null);

  // The URL is the filter state's home (D16): shareable, reloadable, and written
  // with `replace` so a filter change never fills the back button. Search is
  // debounced for the request only, so typing stays instant (A10).
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.propertyId) params.set('propertyId', filters.propertyId);
    if (filters.month) params.set('month', filters.month);
    if (filters.search) params.set('q', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.room) params.set('room', filters.room);
    if (filters.dueFrom) params.set('dueFrom', filters.dueFrom);
    if (filters.dueTo) params.set('dueTo', filters.dueTo);
    if (filters.overdue) params.set('overdue', '1');
    if (filters.needsReview) params.set('needsReview', '1');
    if (filters.method) params.set('method', filters.method);

    void navigate({
      to: '/landlord/payments',
      search: Object.fromEntries(params) as never,
      replace: true,
    });
  }, [filters, navigate]);

  const [searchTerm, setSearchTerm] = useState(filters.search);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(filters.search), 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

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
    queryKey: ['payment-tracker', activePropertyId, filters.month, searchTerm],
    queryFn: () =>
      getPaymentTracker(token!, {
        propertyId: activePropertyId,
        month: filters.month || null,
        search: searchTerm || null,
      }),
    // Wait for the property list: the first request is always for a real property,
    // never an unscoped sweep followed by the right one.
    enabled: Boolean(token) && activePropertyId !== null,
    placeholderData: previous => previous,
  });

  const rows = tracker.data?.data.rows ?? [];
  const visibleRows = useMemo(
    () => rows.filter(row => matchesFilters(row, filters)),
    [rows, filters]
  );
  const metrics = useMemo(() => monitorMetrics(visibleRows), [visibleRows]);
  const rooms = useMemo(
    () => [...new Set(rows.map(row => row.room_number).filter(Boolean))].sort(),
    [rows]
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['payment-tracker'] });
    void queryClient.invalidateQueries({ queryKey: ['payment-history'] });
    void queryClient.invalidateQueries({ queryKey: ['landlord-charge'] });
    void queryClient.invalidateQueries({ queryKey: ['landlord-dashboard'] });
  };

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

  const monthName = monthLabel(filters.month || thisMonth);
  // A dialog opened from a drawer must own focus and Escape on its own.
  const overlayOpen = Boolean(composer || charging || recording);

  function openTenant(row: TrackerRow) {
    setPanel({ kind: 'tenant', row });
  }

  function openReview(row: TrackerRow) {
    const chargeId = row.pending_claim_charge_id ?? row.current_charge_id;

    if (!chargeId) {
      push({ tone: 'error', message: 'This tenant has no charge to review.' });
      return;
    }

    setPanel({ kind: 'review', chargeId, row });
  }

  function openRemind(row: TrackerRow) {
    setComposer({
      row,
      title: `Message ${row.boarder_name.split(' ')[0]}`,
      body: reminderMessage(row, monthName),
      note: row.reminder_sent_at ? `Last reminded ${formatPaymentDate(row.reminder_sent_at)}` : null,
    });
  }

  function openMessage(row: TrackerRow) {
    setComposer({
      row,
      title: `Message ${row.boarder_name.split(' ')[0]}`,
      body: '',
      note: null,
    });
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <PageHeader
        title="Payments"
        actions={
          <Button
            variant="outline"
            disabled={exportCsv.isPending || activePropertyId === null}
            onClick={() => exportCsv.mutate()}
          >
            {exportCsv.isPending ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        <PaymentMonitorFilters
          properties={propertyList.map(property => ({ id: property.id, name: property.name }))}
          rooms={rooms}
          value={filters}
          onChange={setFilters}
          onClear={() => setFilters({ ...emptyMonitorFilters(filters.month), propertyId: filters.propertyId })}
        />

        <PaymentMetricsStrip metrics={metrics} loading={tracker.isLoading} />

        <PaymentMonitorTable
          rows={visibleRows}
          monthName={monthName}
          loading={tracker.isLoading || (tracker.isFetching && rows.length === 0)}
          activeApplicationId={panel.kind === 'tenant' ? panel.row.application_id : null}
          hasProperties={propertyList.length > 0}
          hasFilters={hasActiveFilters(filters)}
          error={tracker.error ? tracker.error.message : null}
          onRetry={() => void tracker.refetch()}
          onClearFilters={() =>
            setFilters({ ...emptyMonitorFilters(filters.month), propertyId: filters.propertyId })
          }
          onOpenTenant={openTenant}
          onReview={openReview}
          onRemind={openRemind}
        />
      </div>

      {panel.kind === 'tenant' && token ? (
        <TenantPaymentDrawer
          token={token}
          row={panel.row}
          onClose={() => setPanel({ kind: 'none' })}
          onSendMessage={() => openMessage(panel.row)}
          onRemind={() => openRemind(panel.row)}
          onReview={() => openReview(panel.row)}
          onLogPayment={() => setRecording(panel.row)}
          onAddCharge={() => setCharging(panel.row)}
          suspended={overlayOpen}
        />
      ) : null}

      {panel.kind === 'review' && token ? (
        <ReviewPaymentDrawer
          token={token}
          chargeId={panel.chargeId}
          row={panel.row}
          onClose={() => setPanel({ kind: 'none' })}
          onChanged={refresh}
          onNotify={push}
          onCompose={input =>
            setComposer({ row: panel.row, title: input.title, body: input.body, note: null })
          }
          suspended={overlayOpen}
        />
      ) : null}

      {composer && token ? (
        <MessageTenantModal
          token={token}
          open
          boarderId={composer.row.boarder_id}
          propertyId={activePropertyId}
          title={composer.title}
          initialBody={composer.body}
          note={composer.note}
          onClose={() => setComposer(null)}
          onSent={() => {
            push({ tone: 'success', message: 'Message sent' });
            void queryClient.invalidateQueries({ queryKey: ['message-threads'] });
            void queryClient.invalidateQueries({ queryKey: ['message-unread'] });
          }}
        />
      ) : null}

      {charging && token ? (
        <AddChargeModal
          open
          rows={rows}
          token={token}
          propertyId={activePropertyId}
          initialBoarderId={charging.boarder_id}
          onClose={() => setCharging(null)}
          onCreated={message => {
            push({ tone: 'success', message });
            refresh();
          }}
          onError={message => push({ tone: 'error', message })}
        />
      ) : null}

      {token ? (
        <RecordPaymentModal
          token={token}
          open={Boolean(recording)}
          boarders={rows.map(row => ({
            application_id: row.application_id,
            boarder_name: row.boarder_name,
          }))}
          initialApplicationId={recording?.application_id ?? null}
          onClose={() => setRecording(null)}
          onRecorded={message => {
            push({ tone: 'success', message });
            refresh();
          }}
          onError={message => push({ tone: 'error', message })}
        />
      ) : null}
    </>
  );
}

/** URL → filter state. Absent keys fall back to the default month. */
export function readFilters(search: string, month: string): MonitorFilters {
  const params = new URLSearchParams(search);

  return {
    ...emptyMonitorFilters(params.get('month') || month),
    propertyId: params.get('propertyId') ?? '',
    status: params.get('status') ?? '',
    room: params.get('room') ?? '',
    dueFrom: params.get('dueFrom') ?? '',
    dueTo: params.get('dueTo') ?? '',
    overdue: params.get('overdue') === '1',
    needsReview: params.get('needsReview') === '1',
    method: params.get('method') ?? '',
    search: params.get('q') ?? '',
  };
}
