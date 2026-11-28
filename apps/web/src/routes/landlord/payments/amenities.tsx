import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  AssignAmenityModal,
  CatalogItemModal,
  EditSubscriptionModal,
  LogUsageModal,
  RejectRequestModal,
} from '../../../components/payments/LandlordAmenityModals';
import {
  AMENITY_PRESETS,
  amenityPriceLabel,
  billingModelLabel,
} from '../../../components/payments/amenity-presets';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { SelectInput } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ToastStack, useToasts } from '../../../components/ui/Toast';
import { getProperties } from '../../../lib/api/landlord';
import {
  approveAmenityRequest,
  approveAmenityUsage,
  cancelLandlordAmenitySubscription,
  createLandlordAmenities,
  getLandlordAmenities,
  updateLandlordAmenity,
} from '../../../lib/api/payments';
import { useAuth } from '../../../lib/auth-context';
import { PAYMENTS_ERROR_HINT, formatPaymentDate, formatPeso } from '../../../lib/payments';
import type { PaidAmenity, TenancyAmenity } from '../../../lib/types';

export const Route = createFileRoute('/landlord/payments/amenities')({
  component: LandlordAmenitiesPage,
});

function LandlordAmenitiesPage() {
  const { token } = useAuth();
  const { toasts, push, dismiss } = useToasts();
  const queryClient = useQueryClient();

  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [tab, setTab] = useState<'subscriptions' | 'history'>('subscriptions');
  const [catalogModal, setCatalogModal] = useState<{ open: boolean; editing: PaidAmenity | null }>({
    open: false,
    editing: null,
  });
  const [assigning, setAssigning] = useState<PaidAmenity | null>(null);
  const [logging, setLogging] = useState<PaidAmenity | null>(null);
  const [editingSub, setEditingSub] = useState<TenancyAmenity | null>(null);
  const [rejecting, setRejecting] = useState<{
    kind: 'subscription' | 'usage';
    id: number;
    label: string;
  } | null>(null);

  const propertiesQuery = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: () => getProperties(token!),
    enabled: Boolean(token),
  });

  const propertyList = propertiesQuery.data?.data.properties ?? [];
  const activePropertyId = selectedPropertyId ?? propertyList[0]?.id ?? null;

  const amenitiesQuery = useQuery({
    queryKey: ['landlord-amenities', activePropertyId],
    queryFn: () => getLandlordAmenities(token!, activePropertyId!),
    enabled: Boolean(token) && activePropertyId !== null,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['landlord-amenities'] });
    void queryClient.invalidateQueries({ queryKey: ['payment-tracker'] });
  };

  const addStarterPresets = useMutation({
    mutationFn: () =>
      createLandlordAmenities(token!, activePropertyId!, AMENITY_PRESETS.slice(0, 5)),
    onSuccess: () => {
      push({ tone: 'success', message: 'Starter amenities added' });
      refresh();
    },
    onError: err => push({ tone: 'error', message: err.message }),
  });

  const toggleActive = useMutation({
    mutationFn: (item: PaidAmenity) =>
      updateLandlordAmenity(token!, item.id, { is_active: !item.is_active }),
    onSuccess: (_, item) => {
      push({
        tone: 'success',
        message: item.is_active ? `${item.name} archived` : `${item.name} reactivated`,
      });
      refresh();
    },
    onError: err => push({ tone: 'error', message: err.message }),
  });

  const approveSub = useMutation({
    mutationFn: (id: number) => approveAmenityRequest(token!, id),
    onSuccess: () => {
      push({ tone: 'success', message: 'Amenity approved and billed' });
      refresh();
    },
    onError: err => push({ tone: 'error', message: err.message }),
  });

  const approveUsage = useMutation({
    mutationFn: (id: number) => approveAmenityUsage(token!, id),
    onSuccess: () => {
      push({ tone: 'success', message: 'Usage confirmed and billed' });
      refresh();
    },
    onError: err => push({ tone: 'error', message: err.message }),
  });

  const cancelSub = useMutation({
    mutationFn: (id: number) => cancelLandlordAmenitySubscription(token!, id),
    onSuccess: () => {
      push({ tone: 'success', message: 'Subscription ended' });
      refresh();
    },
    onError: err => push({ tone: 'error', message: err.message }),
  });

  const data = amenitiesQuery.data?.data;
  const pendingCount = useMemo(
    () =>
      (data?.pending_requests.subscriptions.length ?? 0) +
      (data?.pending_requests.usage.length ?? 0),
    [data]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon="sparkles"
        title="Amenities"
        subtitle="Manage billable add-ons, slot limits, usage charges, and recurring amenity renewals."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {propertyList.length > 0 ? (
              <SelectInput
                aria-label="Property"
                value={activePropertyId ? String(activePropertyId) : ''}
                onChange={e => setSelectedPropertyId(Number(e.target.value))}
                className="!w-auto min-w-[200px]"
              >
                {propertyList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectInput>
            ) : null}
            <Button
              disabled={!activePropertyId}
              onClick={() => setCatalogModal({ open: true, editing: null })}
            >
              <Icon name="plus" size={16} />
              Add amenity
            </Button>
          </div>
        }
      />

      {propertiesQuery.isLoading || amenitiesQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : null}

      {amenitiesQuery.isError ? (
        <ErrorState
          message={amenitiesQuery.error.message}
          hint={PAYMENTS_ERROR_HINT}
          action={<Button onClick={() => amenitiesQuery.refetch()}>Retry</Button>}
        />
      ) : null}

      {!propertiesQuery.isLoading && propertyList.length === 0 ? (
        <EmptyState
          icon="buildingOffice"
          title="No properties yet"
          description="Create a property listing first before configuring billable amenities."
        />
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="kicker">Active catalog</p>
              <p className="mt-2 font-display text-2xl font-medium text-ink">
                {data.summary.active_catalog_count}
              </p>
              <p className="mt-1 text-xs text-gray-ink">Items in {data.property.title}</p>
            </Card>
            <Card>
              <p className="kicker">Monthly recurring</p>
              <p className="tabular mt-2 font-display text-2xl font-medium text-ink">
                {formatPeso(data.summary.monthly_recurring_revenue)}
              </p>
              <p className="mt-1 text-xs text-gray-ink">From active monthly add-ons</p>
            </Card>
            <Card>
              <p className="kicker">Pending requests</p>
              <p className="mt-2 font-display text-2xl font-medium text-ink">{pendingCount}</p>
              <p className="mt-1 text-xs text-gray-ink">Waiting on your approval</p>
            </Card>
            <Card>
              <p className="kicker">Collected this month</p>
              <p className="tabular mt-2 font-display text-2xl font-medium text-ink">
                {formatPeso(data.summary.month_collected)}
              </p>
              <p className="mt-1 text-xs text-gray-ink">
                of {formatPeso(data.summary.month_billed)} billed
              </p>
            </Card>
          </div>

          {pendingCount > 0 ? (
            <Card>
              <h2 className="font-semibold text-ink">Pending requests ({pendingCount})</h2>
              <div className="mt-3 divide-y divide-border/80">
                {data.pending_requests.subscriptions.map(req => (
                  <div
                    key={`sub-${req.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-medium text-ink">
                        {req.boarder_name} · {req.amenity_name}
                        {req.quantity > 1 ? ` ×${req.quantity}` : ''}
                      </p>
                      <p className="text-xs text-gray-ink">
                        {req.room_title} ·{' '}
                        {formatPeso(req.unit_price_snapshot * req.quantity)} (
                        {billingModelLabel(req.billing_model_snapshot)})
                        {req.notes ? ` · “${req.notes}”` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={approveSub.isPending}
                        onClick={() => approveSub.mutate(req.id)}
                      >
                        Approve & Bill
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setRejecting({
                            kind: 'subscription',
                            id: req.id,
                            label: req.amenity_name,
                          })
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}

                {data.pending_requests.usage.map(req => (
                  <div
                    key={`use-${req.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-medium text-ink">
                        {req.boarder_name} · {req.amenity_name} ({req.quantity} {req.unit_label})
                      </p>
                      <p className="text-xs text-gray-ink">
                        {req.room_title} · {formatPeso(req.total_amount)} ·{' '}
                        {formatPaymentDate(req.usage_date)}
                        {req.notes ? ` · “${req.notes}”` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={approveUsage.isPending}
                        onClick={() => approveUsage.mutate(req.id)}
                      >
                        Confirm & Bill
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setRejecting({
                            kind: 'usage',
                            id: req.id,
                            label: req.amenity_name,
                          })
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-medium text-ink">Property catalog</h2>
              {data.catalog.length === 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={addStarterPresets.isPending}
                  onClick={() => addStarterPresets.mutate()}
                >
                  Add 5 common presets
                </Button>
              ) : null}
            </div>

            {data.catalog.length === 0 ? (
              <EmptyState
                icon="sparkles"
                title="No paid amenities configured"
                description="Add recurring add-ons like AC, mini-fridges, parking slots, or per-use services like laundry and sub-metered kWh."
                action={
                  <Button onClick={() => setCatalogModal({ open: true, editing: null })}>
                    Add first amenity
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.catalog.map(item => (
                  <Card key={item.id} className={item.is_active ? '' : 'opacity-70'}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint text-primary">
                          <Icon name={item.icon} size={20} />
                        </span>
                        <div>
                          <h3 className="font-semibold text-ink">{item.name}</h3>
                          <p className="text-xs text-gray-ink">
                            {billingModelLabel(item.billing_model)} · {amenityPriceLabel(item)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge
                        status={item.is_active ? 'active' : 'draft'}
                        label={item.is_active ? 'Active' : 'Archived'}
                      />
                    </div>

                    {item.description ? (
                      <p className="mt-3 text-sm text-gray-ink">{item.description}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-ink">
                      <span>
                        Slots:{' '}
                        {item.max_slots !== null
                          ? `${item.active_slots} / ${item.max_slots}`
                          : 'Unlimited'}
                      </span>
                      <span>
                        Boarder requests: {item.allow_boarder_request ? 'Allowed' : 'Landlord only'}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-3">
                      {item.is_active ? (
                        item.billing_model === 'per_use' ? (
                          <Button size="sm" onClick={() => setLogging(item)}>
                            Log usage
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => setAssigning(item)}>
                            Assign
                          </Button>
                        )
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCatalogModal({ open: true, editing: item })}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={toggleActive.isPending}
                        onClick={() => toggleActive.mutate(item)}
                      >
                        {item.is_active ? 'Archive' : 'Reactivate'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={tab === 'subscriptions' ? 'primary' : 'outline'}
                onClick={() => setTab('subscriptions')}
              >
                Subscriptions ({data.subscriptions.length})
              </Button>
              <Button
                size="sm"
                variant={tab === 'history' ? 'primary' : 'outline'}
                onClick={() => setTab('history')}
              >
                Usage history ({data.usage_logs.length})
              </Button>
            </div>

            {tab === 'subscriptions' ? (
              <Card>
                {data.subscriptions.length === 0 ? (
                  <p className="text-sm text-gray-ink">No boarder amenity subscriptions yet.</p>
                ) : (
                  <div className="divide-y divide-border/80">
                    {data.subscriptions.map(sub => (
                      <div
                        key={sub.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-ink">
                              {sub.boarder_name} · {sub.amenity_name}
                              {sub.quantity > 1 ? ` ×${sub.quantity}` : ''}
                            </p>
                            <StatusBadge status={sub.status} label={sub.status.replace('_', ' ')} />
                          </div>
                          <p className="text-xs text-gray-ink">
                            {sub.room_title} · {formatPeso(sub.unit_price_snapshot)} each
                            {sub.next_bill_date
                              ? ` · Next bill ${formatPaymentDate(sub.next_bill_date)}`
                              : ''}
                          </p>
                        </div>
                        {sub.status === 'active' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingSub(sub)}
                            >
                              Update rate/qty
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={cancelSub.isPending}
                              onClick={() => cancelSub.mutate(sub.id)}
                            >
                              End
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ) : (
              <Card>
                {data.usage_logs.length === 0 ? (
                  <p className="text-sm text-gray-ink">No per-use or metered usage logged yet.</p>
                ) : (
                  <div className="divide-y divide-border/80">
                    {data.usage_logs.map(log => (
                      <div
                        key={log.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div>
                          <p className="font-medium text-ink">
                            {log.boarder_name} · {log.amenity_name} ({log.quantity} {log.unit_label})
                          </p>
                          <p className="text-xs text-gray-ink">
                            {log.room_title} · {formatPaymentDate(log.usage_date)}
                            {log.previous_reading !== null && log.current_reading !== null
                              ? ` · Meter ${log.previous_reading}→${log.current_reading}`
                              : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular font-semibold text-ink">
                            {formatPeso(log.total_amount)}
                          </span>
                          <StatusBadge
                            status={log.payment_status ?? log.status}
                            label={(log.payment_status ?? log.status).replace('_', ' ')}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </section>
        </>
      ) : null}

      <CatalogItemModal
        open={catalogModal.open}
        editing={catalogModal.editing}
        propertyId={activePropertyId}
        token={token ?? ''}
        onClose={() => setCatalogModal({ open: false, editing: null })}
        onSaved={msg => {
          push({ tone: 'success', message: msg });
          refresh();
        }}
        onError={msg => push({ tone: 'error', message: msg })}
      />

      <AssignAmenityModal
        amenity={assigning}
        propertyId={activePropertyId}
        boarders={data?.boarders ?? []}
        token={token ?? ''}
        onClose={() => setAssigning(null)}
        onDone={msg => {
          push({ tone: 'success', message: msg });
          refresh();
        }}
        onError={msg => push({ tone: 'error', message: msg })}
      />

      <LogUsageModal
        amenity={logging}
        propertyId={activePropertyId}
        boarders={data?.boarders ?? []}
        token={token ?? ''}
        onClose={() => setLogging(null)}
        onDone={msg => {
          push({ tone: 'success', message: msg });
          refresh();
        }}
        onError={msg => push({ tone: 'error', message: msg })}
      />

      <EditSubscriptionModal
        subscription={editingSub}
        token={token ?? ''}
        onClose={() => setEditingSub(null)}
        onDone={msg => {
          push({ tone: 'success', message: msg });
          refresh();
        }}
        onError={msg => push({ tone: 'error', message: msg })}
      />

      <RejectRequestModal
        target={rejecting}
        token={token ?? ''}
        onClose={() => setRejecting(null)}
        onDone={msg => {
          push({ tone: 'success', message: msg });
          refresh();
        }}
        onError={msg => push({ tone: 'error', message: msg })}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
