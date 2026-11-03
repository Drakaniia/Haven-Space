import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import {
  bulkPatchPropertyStatus,
  getProperties,
  getPropertyRooms,
  patchPropertyStatus,
} from '../../../lib/api/admin';
import type { AdminPropertyRow } from '../../../lib/types';
import { roomTypeLabel } from '../../../lib/room-drafts';
import {
  PropertyCard,
  PropertyCardList,
  adminFacts,
  moderationPill,
  propertyAddress,
} from '../../properties/PropertyCard';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Spinner } from '../../ui/Spinner';
import { StatusBadge } from '../../ui/StatusBadge';
import { AdminSection } from '../AdminSection';
import { BULK_SELECT_CLASSES, BulkActionBar } from '../BulkActionBar';
import { TableSkeleton } from '../AdminSkeletons';
import type { PushToast } from '../sections';

type PendingConfirm = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  run: () => void;
};

/**
 * Listings submitted for moderation.
 *
 * The moderation queue is a card list now (`landlord-properties-card-layout`
 * R18/R20): each card carries its moderation status as the photo pill, the same
 * fact chips as the landlord surfaces, and the read-only per-room view inline
 * instead of behind a modal. `Select` reveals a checkbox per card and the bulk
 * bar plus the 100-item cap are unchanged — only the table header checkbox
 * became an explicit `Select all (first 100)` control.
 */
export function PropertiesSection({ token, push }: { token: string; push: PushToast }) {
  const queryClient = useQueryClient();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState('reject');
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [openRooms, setOpenRooms] = useState<number[]>([]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const properties = useQuery({
    queryKey: ['admin', 'properties'],
    queryFn: () => getProperties(token),
    enabled: Boolean(token),
  });

  const patchProperty = useMutation({
    mutationFn: ({ propertyId, action }: { propertyId: number; action: string }) =>
      patchPropertyStatus(token, propertyId, action),
    onSuccess: result => {
      push({ tone: 'success', message: result.message });
      setConfirm(null);
      invalidate();
    },
    onError: (error: Error) => {
      push({ tone: 'error', message: error.message });
      setConfirm(null);
    },
  });

  const bulkProperties = useMutation({
    mutationFn: ({ ids, action }: { ids: number[]; action: string }) =>
      bulkPatchPropertyStatus(token, ids, action),
    onSuccess: result => {
      const failed = result.data?.failed?.length ?? 0;
      push({ tone: 'success', message: result.message });
      if (failed > 0) push({ tone: 'error', message: `${failed} failed` });
      if (failed === 0) setSelected(new Set());
      else setSelected(new Set(result.data?.failed.map(f => f.id) ?? []));
      setConfirm(null);
      invalidate();
    },
    onError: (error: Error) => {
      push({ tone: 'error', message: error.message });
      setConfirm(null);
    },
  });

  const overCap = selected.size > 100;
  const rows = properties.data?.data ?? [];

  function toggleRow(id: number) {
    const next = new Set(selected);

    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size >= 100) {
        push({ tone: 'error', message: 'Max 100 per bulk operation' });
        return;
      }
      next.add(id);
    }

    setSelected(next);
  }

  function selectAll() {
    if (rows.length > 100) {
      push({ tone: 'info', message: 'Selected first 100 — max 100 per bulk operation' });
    }
    setSelected(new Set(rows.slice(0, 100).map(row => row.id)));
  }

  function toggleRooms(propertyId: number) {
    setOpenRooms(current =>
      current.includes(propertyId)
        ? current.filter(id => id !== propertyId)
        : [...current, propertyId]
    );
  }

  function requestAction(row: AdminPropertyRow, action: string) {
    if (action === 'publish') {
      patchProperty.mutate({ propertyId: row.id, action });
      return;
    }

    setConfirm({
      title: `${action === 'reject' ? 'Reject' : 'Flag'} ${row.title}?`,
      message: `This will set moderation status to "${action}" for this property.`,
      confirmLabel: action === 'reject' ? 'Reject' : 'Flag',
      run: () => patchProperty.mutate({ propertyId: row.id, action }),
    });
  }

  function requestBulk() {
    const count = selected.size;
    setConfirm({
      title: `${bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1)} ${count} propert${
        count > 1 ? 'ies' : 'y'
      }?`,
      message: `This will set moderation status to "${bulkAction}" for ${count} selected properties.`,
      confirmLabel: bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1),
      run: () => bulkProperties.mutate({ ids: Array.from(selected), action: bulkAction }),
    });
  }

  return (
    <AdminSection
      section="properties"
      isLoading={properties.isLoading}
      error={properties.error}
      empty={!properties.data?.data.length}
      emptyTitle="No properties found"
      emptyIcon="list"
      skeleton={<TableSkeleton rows={5} columns={5} />}
      actions={
        rows.length ? (
          <Button
            variant={selectMode ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              if (selectMode) setSelected(new Set());
              setSelectMode(value => !value);
            }}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </Button>
        ) : null
      }
      toolbar={
        rows.length ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-ink">{rows.length} properties</p>
            {selectMode ? (
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select all (first 100)
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      <PropertyCardList>
        {rows.map(row => (
          <PropertyCard
            key={row.id}
            title={row.title}
            imageUrl={row.cover_photo}
            pill={moderationPill(row.listing_moderation_status)}
            address={propertyAddress(row)}
            facts={adminFacts(row)}
            note={[row.landlord_first, row.landlord_last].filter(Boolean).join(' ')}
            selection={
              selectMode
                ? {
                    checked: selected.has(row.id),
                    onChange: () => toggleRow(row.id),
                    label: `Select ${row.title}`,
                  }
                : undefined
            }
            actions={
              <>
                <Button variant="ghost" size="sm" onClick={() => requestAction(row, 'publish')}>
                  Publish
                </Button>
                <Button
                  variant="dangerGhost"
                  size="sm"
                  onClick={() => requestAction(row, 'reject')}
                >
                  Reject
                </Button>
                <Button variant="warningGhost" size="sm" onClick={() => requestAction(row, 'flag')}>
                  Flag
                </Button>
              </>
            }
            rooms={{
              id: `admin-property-rooms-${row.id}`,
              open: openRooms.includes(row.id),
              onToggle: () => toggleRooms(row.id),
              content: <AdminPropertyRooms token={token} propertyId={row.id} />,
            }}
          />
        ))}
      </PropertyCardList>

      {selectMode && selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          busy={bulkProperties.isPending}
          overCap={overCap}
          onApply={requestBulk}
          onCancel={() => {
            setSelectMode(false);
            setSelected(new Set());
          }}
          actionControl={
            <select
              aria-label="Bulk property action"
              value={bulkAction}
              onChange={event => setBulkAction(event.target.value)}
              className={BULK_SELECT_CLASSES}
            >
              <option value="publish">publish</option>
              <option value="reject">reject</option>
              <option value="flag">flag</option>
            </select>
          }
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? null}
        confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
        busy={patchProperty.isPending || bulkProperties.isPending}
        onConfirm={() => confirm?.run()}
        onCancel={() => setConfirm(null)}
      />
    </AdminSection>
  );
}

/**
 * Read-only per-room view for one property (`create-listing-room-details`
 * R10) — the same rows the modal used to show, inline under the card.
 */
function AdminPropertyRooms({ token, propertyId }: { token: string; propertyId: number }) {
  const rooms = useQuery({
    queryKey: ['admin', 'property-rooms', propertyId],
    queryFn: () => getPropertyRooms(token, propertyId),
    enabled: Boolean(token && propertyId),
  });

  if (rooms.isLoading) {
    return <Spinner />;
  }

  if (rooms.error) {
    return <p className="text-sm text-error-ink">{rooms.error.message}</p>;
  }

  if ((rooms.data?.data.length ?? 0) === 0) {
    return <p className="text-sm text-gray-ink">This property has no rooms.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {rooms.data!.data.map(room => (
        <li
          key={room.id}
          className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
        >
          <span className="font-medium text-ink">{room.room_number || `Room ${room.id}`}</span>
          <span className="text-gray-ink">
            {roomTypeLabel(room.room_type)} · ₱{Number(room.price).toLocaleString()}
          </span>
          <span className="text-gray-ink">
            {room.occupied} of {room.capacity} occupied · {room.free_slots}{' '}
            {room.free_slots === 1 ? 'slot' : 'slots'} free
          </span>
          <span className="text-gray-ink">
            {room.photo_count} {room.photo_count === 1 ? 'photo' : 'photos'}
          </span>
          <StatusBadge status={room.status} />
        </li>
      ))}
    </ul>
  );
}
