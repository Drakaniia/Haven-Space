import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  amenityPriceLabel,
  billingModelLabel,
} from '../../../components/payments/amenity-presets';
import { Button, buttonClasses } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Field, TextInput } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ToastStack, useToasts } from '../../../components/ui/Toast';
import {
  cancelBoarderAmenitySubscription,
  getBoarderAmenities,
  requestBoarderAmenity,
  requestBoarderAmenityUsage,
} from '../../../lib/api/payments';
import { useAuth } from '../../../lib/auth-context';
import { PAYMENTS_ERROR_HINT, formatPaymentDate, formatPeso } from '../../../lib/payments';
import type { PaidAmenity } from '../../../lib/types';

export const Route = createFileRoute('/boarder/payments/amenities')({
  component: BoarderAmenitiesPage,
});

function RequestAmenityModal({
  amenity,
  token,
  onClose,
  onDone,
  onError,
}: {
  amenity: PaidAmenity | null;
  token: string;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  const submit = useMutation({
    mutationFn: async (): Promise<unknown> =>
      amenity!.billing_model === 'per_use'
        ? await requestBoarderAmenityUsage(token, amenity!.id, {
            quantity: Number(quantity || 1),
            notes: notes.trim() || null,
          })
        : await requestBoarderAmenity(token, amenity!.id, {
            quantity: Number(quantity || 1),
            notes: notes.trim() || null,
          }),
    onSuccess: () => {
      onDone('Request sent to your landlord');
      setQuantity('1');
      setNotes('');
      onClose();
    },
    onError: err => onError(err.message),
  });

  const qtyNum = Math.max(Number(quantity || 0), 0);
  const total = amenity ? amenity.price * qtyNum : 0;

  return (
    <Modal
      open={Boolean(amenity)}
      title={
        amenity?.billing_model === 'per_use'
          ? `Request ${amenity.name} usage`
          : `Request ${amenity?.name ?? 'amenity'}`
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <Field
          label={`Quantity (${amenity?.unit_label ?? 'unit'})`}
          htmlFor="boarder-amenity-qty"
        >
          <TextInput
            id="boarder-amenity-qty"
            type="number"
            min={amenity?.billing_model === 'per_use' ? '0.5' : '1'}
            step={amenity?.billing_model === 'per_use' ? '0.5' : '1'}
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
          />
        </Field>
        <Field label="Note for landlord (optional)" htmlFor="boarder-amenity-note">
          <TextInput
            id="boarder-amenity-note"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g., Needed starting today"
          />
        </Field>
        <p className="text-sm text-gray-ink">
          Estimated charge: <span className="font-semibold text-ink">{formatPeso(total)}</span>
          {amenity?.billing_model === 'monthly' ? ' per month once approved' : ''}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={qtyNum <= 0 || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? 'Sending...' : 'Send request'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function BoarderAmenitiesPage() {
  const { token } = useAuth();
  const { toasts, push, dismiss } = useToasts();
  const queryClient = useQueryClient();
  const [requesting, setRequesting] = useState<PaidAmenity | null>(null);

  const query = useQuery({
    queryKey: ['boarder-amenities'],
    queryFn: () => getBoarderAmenities(token!),
    enabled: Boolean(token),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['boarder-amenities'] });
    void queryClient.invalidateQueries({ queryKey: ['boarder-payments'] });
  };

  const cancel = useMutation({
    mutationFn: (id: number) => cancelBoarderAmenitySubscription(token!, id),
    onSuccess: () => {
      push({ tone: 'success', message: 'Amenity subscription cancelled' });
      refresh();
    },
    onError: err => push({ tone: 'error', message: err.message }),
  });

  const data = query.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        icon="sparkles"
        title="Amenities"
        subtitle={
          data
            ? `${data.tenancy.property_title} · ${data.tenancy.room_title} · +${formatPeso(data.active_monthly_total)} / mo in active add-ons`
            : 'Request property add-ons, track your active amenities, and view amenity bills.'
        }
        actions={
          <Link to="/boarder/payments" className={buttonClasses({ variant: 'outline' })}>
            View full ledger
          </Link>
        }
      />

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1].map(i => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <ErrorState
          message={query.error.message}
          hint={PAYMENTS_ERROR_HINT}
          action={<Button onClick={() => query.refetch()}>Retry</Button>}
        />
      ) : null}

      {data ? (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-xl font-medium text-ink">My amenities</h2>
            {data.subscriptions.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-ink">
                  You have no subscribed add-ons yet. Request one from the property catalog below.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {data.subscriptions.map(sub => (
                  <Card key={sub.id} className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">
                          {sub.amenity_name}
                          {sub.quantity > 1 ? ` ×${sub.quantity}` : ''}
                        </span>
                        <StatusBadge status={sub.status} label={sub.status.replace('_', ' ')} />
                      </div>
                      <p className="mt-1 text-sm text-gray-ink">
                        {formatPeso(sub.unit_price_snapshot * sub.quantity)} ·{' '}
                        {billingModelLabel(sub.billing_model_snapshot)}
                        {sub.next_bill_date
                          ? ` · Next bill ${formatPaymentDate(sub.next_bill_date)}`
                          : ''}
                      </p>
                      {sub.rejection_reason ? (
                        <p className="mt-1 text-xs text-error-ink">
                          Reason: {sub.rejection_reason}
                        </p>
                      ) : null}
                    </div>
                    {sub.status === 'active' || sub.status === 'pending_approval' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={cancel.isPending}
                        onClick={() => cancel.mutate(sub.id)}
                      >
                        {sub.status === 'pending_approval' ? 'Withdraw' : 'Cancel renewal'}
                      </Button>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-medium text-ink">Available at property</h2>
            {data.catalog.length === 0 ? (
              <EmptyState
                icon="sparkles"
                title="No add-on amenities listed"
                description="Your landlord hasn’t added billable or tracked amenities for this property yet."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.catalog.map(item => {
                  const slotsLeft =
                    item.max_slots !== null ? Math.max(item.max_slots - item.active_slots, 0) : null;
                  const full = slotsLeft !== null && slotsLeft <= 0;

                  return (
                    <Card key={item.id}>
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
                        {item.is_included ? (
                          <StatusBadge status="active" label="Included" />
                        ) : null}
                      </div>

                      {item.description ? (
                        <p className="mt-3 text-sm text-gray-ink">{item.description}</p>
                      ) : null}

                      {slotsLeft !== null ? (
                        <p className="mt-2 text-xs text-gray-ink">
                          {full ? 'No slots available' : `${slotsLeft} of ${item.max_slots} slots left`}
                        </p>
                      ) : null}

                      <div className="mt-4 pt-2">
                        {item.allow_boarder_request ? (
                          <Button
                            size="sm"
                            disabled={full && item.billing_model !== 'per_use'}
                            onClick={() => setRequesting(item)}
                          >
                            {full && item.billing_model !== 'per_use'
                              ? 'Full'
                              : item.billing_model === 'per_use'
                                ? 'Request usage'
                                : 'Request add-on'}
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-ink">Assigned by landlord</span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-medium text-ink">
              Amenity charges & usage history
            </h2>
            <Card>
              {data.charges.length === 0 && data.usage_logs.length === 0 ? (
                <p className="text-sm text-gray-ink">No amenity charges or usage logged yet.</p>
              ) : (
                <div className="divide-y divide-border/80">
                  {data.charges.map(charge => (
                    <div
                      key={`ch-${charge.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="font-medium text-ink">{charge.description}</p>
                        <p className="text-xs text-gray-ink">
                          Due {formatPaymentDate(charge.due_date)}
                          {charge.paid_date ? ` · Paid ${formatPaymentDate(charge.paid_date)}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="tabular font-semibold text-ink">
                          {formatPeso(charge.amount)}
                        </span>
                        <StatusBadge
                          status={charge.status}
                          label={charge.status.replace('_', ' ')}
                        />
                        {charge.status === 'pending' || charge.status === 'overdue' ? (
                          <Link
                            to="/boarder/payments/pay"
                            search={{ chargeId: charge.id }}
                            className={buttonClasses({ size: 'sm' })}
                          >
                            Pay now
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>
        </>
      ) : null}

      <RequestAmenityModal
        amenity={requesting}
        token={token ?? ''}
        onClose={() => setRequesting(null)}
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
