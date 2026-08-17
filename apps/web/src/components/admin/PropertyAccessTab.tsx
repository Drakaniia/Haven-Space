import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import {
  getLandlordCreatedData,
  getProperties,
  getPropertyAccess,
  getPropertyAccessHistory,
  getVerifiedLandlords,
  removePropertyAccess,
  revokePropertyAccessInvitation,
  sendPropertyAccessInvitation,
} from '../../lib/api/admin';
import type {
  AdminPropertyAccessRow,
  AuthorizedLandlord,
  LandlordCreatedData,
  PropertyAccessHistoryEvent,
} from '../../lib/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DataTable, type Column } from '../ui/DataTable';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Field, SelectInput } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { Spinner } from '../ui/Spinner';

function formatWhen(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function fullName(first: string, last: string): string {
  return [first, last].filter(Boolean).join(' ').trim() || '—';
}

export function PropertyAccessTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedLandlord, setSelectedLandlord] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('');
  const [removal, setRemoval] = useState<{
    property: AdminPropertyAccessRow;
    landlord: AuthorizedLandlord;
  } | null>(null);
  const [removalData, setRemovalData] = useState<LandlordCreatedData | null>(null);
  const [removalLoading, setRemovalLoading] = useState(false);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'property-access'] });
  };

  const access = useQuery({
    queryKey: ['admin', 'property-access'],
    queryFn: () => getPropertyAccess(token),
    enabled: Boolean(token),
  });

  const landlords = useQuery({
    queryKey: ['admin', 'landlords', 'verified'],
    queryFn: () => getVerifiedLandlords(token),
    enabled: Boolean(token),
  });

  const properties = useQuery({
    queryKey: ['admin', 'properties', 'all'],
    queryFn: () => getProperties(token),
    enabled: Boolean(token),
  });

  const history = useQuery({
    queryKey: ['admin', 'property-access', 'history'],
    queryFn: () => getPropertyAccessHistory(token),
    enabled: Boolean(token) && showHistory,
  });

  const sendInvite = useMutation({
    mutationFn: ({ landlordId, propertyId }: { landlordId: number; propertyId: number }) =>
      sendPropertyAccessInvitation(token, { landlordId, propertyId }),
    onSuccess: result => {
      setNotice(result.message);
      setError('');
      setSelectedLandlord('');
      setSelectedProperty('');
      invalidate();
    },
    onError: (inviteError: Error) => {
      setError(inviteError.message);
      setNotice('');
    },
  });

  const revokeInvite = useMutation({
    mutationFn: (invitationId: number) => revokePropertyAccessInvitation(token, invitationId),
    onSuccess: result => {
      setNotice(result.message);
      setError('');
      invalidate();
    },
    onError: (revokeError: Error) => {
      setError(revokeError.message);
      setNotice('');
    },
  });

  const removeAccess = useMutation({
    mutationFn: ({ propertyId, landlordId }: { propertyId: number; landlordId: number }) =>
      removePropertyAccess(token, { propertyId, landlordId }),
    onSuccess: result => {
      setNotice(result.message);
      setError('');
      setRemoval(null);
      setRemovalData(null);
      invalidate();
    },
    onError: (removeError: Error) => {
      setError(removeError.message);
      setNotice('');
      setRemoval(null);
      setRemovalData(null);
    },
  });

  async function openRemoval(property: AdminPropertyAccessRow, landlord: AuthorizedLandlord) {
    setRemoval({ property, landlord });
    setRemovalData(null);
    setRemovalLoading(true);

    try {
      const response = await getLandlordCreatedData(token, property.id, landlord.id);
      setRemovalData(response.data.created);
    } catch {
      setRemovalData({ rooms: 0, tenants: 0, payments: 0, announcements: 0 });
    } finally {
      setRemovalLoading(false);
    }
  }

  function handleSubmitInvite(event: FormEvent) {
    event.preventDefault();
    const landlordId = Number.parseInt(selectedLandlord, 10);
    const propertyId = Number.parseInt(selectedProperty, 10);

    if (!Number.isFinite(landlordId) || !Number.isFinite(propertyId)) {
      setError('Select both a landlord and a property to invite.');
      return;
    }

    sendInvite.mutate({ landlordId, propertyId });
  }

  const columns: Column<AdminPropertyAccessRow>[] = [
    { header: 'Property', cell: row => row.title },
    { header: 'Owner', cell: row => row.owner.name },
    {
      header: 'Authorized landlords',
      cell: row => (row.authorized_landlords.length > 0 ? row.authorized_landlords.length : '—'),
    },
    {
      header: 'Pending invitations',
      cell: row => (row.pending_invitations.length > 0 ? row.pending_invitations.length : '—'),
    },
  ];

  const historyColumns: Column<PropertyAccessHistoryEvent>[] = [
    { header: 'Event', cell: row => row.type.replaceAll('_', ' ') },
    { header: 'Property', cell: row => row.property_name },
    { header: 'Landlord', cell: row => row.landlord_name },
    { header: 'Actor', cell: row => row.actor_name ?? '—' },
    { header: 'When', cell: row => formatWhen(row.at) },
  ];

  const createdLabel = (created: LandlordCreatedData): ReactNode => (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
      <span>
        Rooms: <strong>{created.rooms}</strong>
      </span>
      <span>
        Tenants: <strong>{created.tenants}</strong>
      </span>
      <span>
        Payments: <strong>{created.payments}</strong>
      </span>
      <span>
        Announcements: <strong>{created.announcements}</strong>
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      {notice ? (
        <div className="rounded-md border border-mint bg-mint/40 px-4 py-2 text-sm">{notice}</div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <Icon name="users" size={24} className="shrink-0" />
          <div>
            <h3 className="font-semibold text-ink">Invite a landlord</h3>
            <p className="text-sm text-gray-ink">
              Grant another landlord access to one of your platform's properties.
            </p>
          </div>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmitInvite}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Landlord (verified accounts)" htmlFor="access-landlord">
              <SelectInput
                id="access-landlord"
                value={selectedLandlord}
                onChange={event => setSelectedLandlord(event.target.value)}
                disabled={landlords.isLoading}
              >
                <option value="">Select a landlord…</option>
                {(landlords.data?.data ?? []).map(landlord => (
                  <option key={landlord.id} value={landlord.id}>
                    {fullName(landlord.first_name, landlord.last_name)} — {landlord.email}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Property" htmlFor="access-property">
              <SelectInput
                id="access-property"
                value={selectedProperty}
                onChange={event => setSelectedProperty(event.target.value)}
                disabled={properties.isLoading}
              >
                <option value="">Select a property…</option>
                {(properties.data?.data ?? []).map(property => (
                  <option key={property.id} value={property.id}>
                    {property.title} — {fullName(property.landlord_first, property.landlord_last)}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div>
            <Button type="submit" disabled={sendInvite.isPending}>
              {sendInvite.isPending ? 'Sending…' : 'Send invitation'}
            </Button>
          </div>
        </form>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink">Properties &amp; access</h3>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowHistory(value => !value)}
          className="flex items-center gap-2"
        >
          <Icon name="history" size={16} className="shrink-0" />
          {showHistory ? 'Hide history' : 'View history'}
        </Button>
      </div>

      {showHistory ? (
        <Card>
          {history.isLoading ? (
            <Spinner />
          ) : history.error ? (
            <ErrorState message={history.error.message} />
          ) : history.data && history.data.data.events.length > 0 ? (
            <DataTable<PropertyAccessHistoryEvent>
              rows={history.data.data.events}
              columns={historyColumns}
              keyFor={row => `${row.type}-${row.invitation_id ?? row.access_id}-${row.at}`}
            />
          ) : (
            <EmptyState title="No access history yet" />
          )}
        </Card>
      ) : null}

      {access.isLoading ? (
        <Spinner />
      ) : access.error ? (
        <ErrorState message={access.error.message} />
      ) : access.data && access.data.data.properties.length > 0 ? (
        <DataTable<AdminPropertyAccessRow>
          rows={access.data.data.properties}
          columns={columns}
          keyFor={row => row.id}
          expandable={row => (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Authorized landlords</p>
                {row.authorized_landlords.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {row.authorized_landlords.map(landlord => (
                      <li
                        key={landlord.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink">
                            {fullName(landlord.first_name, landlord.last_name)}
                          </p>
                          <p className="text-xs text-gray-ink">
                            {landlord.email} · granted {formatWhen(landlord.granted_at)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="danger"
                          className="text-xs"
                          onClick={() => openRemoval(row, landlord)}
                        >
                          Remove access
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-ink">No authorized landlords.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Pending invitations</p>
                {row.pending_invitations.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {row.pending_invitations.map(invitation => (
                      <li
                        key={invitation.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink">{invitation.invitee_name}</p>
                          <p className="text-xs text-gray-ink">
                            {invitation.invitee_email} · sent {formatWhen(invitation.created_at)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="text-xs"
                          disabled={revokeInvite.isPending}
                          onClick={() => revokeInvite.mutate(invitation.id)}
                        >
                          Revoke
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-ink">No pending invitations.</p>
                )}
              </div>
            </div>
          )}
        />
      ) : (
        <EmptyState title="No properties found" />
      )}

      <ConfirmDialog
        open={removal !== null}
        title="Remove access"
        message={
          removal ? (
            <div className="space-y-2">
              <p>
                Remove{' '}
                <strong>{fullName(removal.landlord.first_name, removal.landlord.last_name)}</strong>{' '}
                from <strong>{removal.property.title}</strong>?
              </p>
              {removalLoading ? (
                <p className="text-gray-ink">Checking data created by this landlord…</p>
              ) : removalData ? (
                <div className="rounded-md bg-cream p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-ink">
                    Data they created
                  </p>
                  {createdLabel(removalData)}
                  <p className="mt-2 text-xs text-gray-ink">
                    Removing access does not delete this data. It stays with the property.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null
        }
        confirmLabel="Remove access"
        busy={removalLoading || removeAccess.isPending}
        onConfirm={() => {
          if (removal) {
            removeAccess.mutate({
              propertyId: removal.property.id,
              landlordId: removal.landlord.id,
            });
          }
        }}
        onCancel={() => {
          setRemoval(null);
          setRemovalData(null);
        }}
      />
    </div>
  );
}
