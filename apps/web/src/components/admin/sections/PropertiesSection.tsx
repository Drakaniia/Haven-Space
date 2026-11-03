import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
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
  PropertyCardSkeletonList,
  adminFacts,
  moderationPill,
  propertyAddress,
} from '../../properties/PropertyCard';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Skeleton } from '../../ui/Skeleton';
import { StatusBadge } from '../../ui/StatusBadge';
import { AdminSection } from '../AdminSection';
import {
  FilterChips,
  NoMatches,
  SearchField,
  TableToolbar,
  countBy,
  matchesQuery,
  resultCount,
} from '../AdminToolbar';
import { BULK_SELECT_CLASSES, BulkActionBar } from '../BulkActionBar';
import { ToolbarSkeleton } from '../AdminSkeletons';
import type { PushToast } from '../sections';

type PendingConfirm = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  run: () => void;
};

type ModerationFilter = 'all' | 'pending_review' | 'published' | 'flagged' | 'rejected';

/** The moderation status each action produces, so a card never offers a no-op. */
const ACTION_RESULT: Record<string, string> = {
  publish: 'published',
  reject: 'rejected',
  flag: 'flagged',
};

/**
 * Listings submitted for moderation.
 *
 * The moderation queue is a card list (`landlord-properties-card-layout`
 * R18/R20): each card carries its moderation status as the photo pill, the same
 * fact chips as the landlord surfaces, and the read-only per-room view inline
 * instead of behind a modal. `Select` reveals a checkbox per card; the bulk bar
 * and the 100-item cap are unchanged, and `Select all (first 100)` acts on the
 * cards the current filters show.
 *
 * A card only offers the moderation actions that would change it — a published
 * listing has no "Publish" — so every visible button does something.
 */
export function PropertiesSection({ token, push }: { token: string; push: PushToast }) {
  const queryClient = useQueryClient();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState('reject');
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [openRooms, setOpenRooms] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [moderation, setModeration] = useState<ModerationFilter>('all');

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

  const moderationCounts = useMemo(() => countBy(rows, row => row.listing_moderation_status), [rows]);
  const visible = useMemo(
    () =>
      rows.filter(
        row =>
          (moderation === 'all' || row.listing_moderation_status === moderation) &&
          matchesQuery(
            query,
            row.title,
            `${row.landlord_first} ${row.landlord_last}`,
            row.landlord_email,
            row.address,
            row.city,
            row.province
          )
      ),
    [rows, moderation, query]
  );
  const visibleIds = new Set(visible.map(row => row.id));
  const hiddenSelected = Array.from(selected).filter(id => !visibleIds.has(id)).length;
  const filtered = query.trim() !== '' || moderation !== 'all';

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
    if (visible.length > 100) {
      push({ tone: 'info', message: 'Selected first 100 — max 100 per bulk operation' });
    }
    setSelected(new Set(visible.slice(0, 100).map(row => row.id)));
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
      message:
        action === 'reject'
          ? `This will set moderation status to "reject" for this property. It comes off the public listings, and the landlord can edit and resubmit it.`
          : `This will set moderation status to "flag" for this property. It stays off the public listings until an admin publishes it again.`,
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

  function cardActions(row: AdminPropertyRow) {
    const offers = (action: string) => ACTION_RESULT[action] !== row.listing_moderation_status;
    const busy = patchProperty.isPending && patchProperty.variables?.propertyId === row.id;
    return (
      <>
        {offers('publish') ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || selectMode}
            aria-label={`Publish ${row.title}`}
            onClick={() => requestAction(row, 'publish')}
          >
            Publish
          </Button>
        ) : null}
        {offers('reject') ? (
          <Button
            variant="dangerGhost"
            size="sm"
            disabled={busy || selectMode}
            aria-label={`Reject ${row.title}`}
            onClick={() => requestAction(row, 'reject')}
          >
            Reject
          </Button>
        ) : null}
        {offers('flag') ? (
          <Button
            variant="warningGhost"
            size="sm"
            disabled={busy || selectMode}
            aria-label={`Flag ${row.title}`}
            onClick={() => requestAction(row, 'flag')}
          >
            Flag
          </Button>
        ) : null}
      </>
    );
  }

  return (
    <AdminSection
      section="properties"
      isLoading={properties.isLoading}
      error={properties.error}
      onRetry={() => void properties.refetch()}
      empty={!properties.data?.data.length}
      emptyTitle="No listings yet"
      emptyDescription="Listings appear here as soon as a landlord creates one. New and edited listings wait for review before going live."
      emptyIcon="list"
      skeleton={
        <>
          <ToolbarSkeleton chips={5} />
          <PropertyCardSkeletonList count={4} />
        </>
      }
      actions={
        rows.length ? (
          <Button
            variant={selectMode ? 'secondary' : 'outline'}
            size="sm"
            aria-pressed={selectMode}
            onClick={() => {
              if (selectMode) setSelected(new Set());
              setSelectMode(value => !value);
            }}
          >
            {selectMode ? 'Done selecting' : 'Select'}
          </Button>
        ) : null
      }
      toolbar={
        <TableToolbar
          count={resultCount(visible.length, rows.length, 'property', 'properties')}
          trailing={
            selectMode && visible.length > 0 ? (
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select all (first 100)
              </Button>
            ) : null
          }
        >
          <SearchField
            label="Search properties"
            placeholder="Search title, landlord or address"
            value={query}
            onChange={setQuery}
          />
          <FilterChips<ModerationFilter>
            label="Filter by moderation status"
            value={moderation}
            onChange={setModeration}
            options={[
              { value: 'all', label: 'All' },
              {
                value: 'pending_review',
                label: 'Pending review',
                count: moderationCounts.pending_review ?? 0,
              },
              { value: 'published', label: 'Published', count: moderationCounts.published ?? 0 },
              { value: 'flagged', label: 'Flagged', count: moderationCounts.flagged ?? 0 },
              { value: 'rejected', label: 'Rejected', count: moderationCounts.rejected ?? 0 },
            ]}
          />
        </TableToolbar>
      }
    >
      {visible.length === 0 && filtered ? (
        <NoMatches
          noun="properties"
          onClear={() => {
            setQuery('');
            setModeration('all');
          }}
        />
      ) : (
        <PropertyCardList>
          {visible.map(row => (
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
              actions={cardActions(row)}
              rooms={{
                id: `admin-property-rooms-${row.id}`,
                open: openRooms.includes(row.id),
                onToggle: () => toggleRooms(row.id),
                content: <AdminPropertyRooms token={token} propertyId={row.id} />,
              }}
            />
          ))}
        </PropertyCardList>
      )}

      {selectMode && selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          hiddenCount={hiddenSelected}
          busy={bulkProperties.isPending}
          overCap={overCap}
          onApply={requestBulk}
          onCancel={() => {
            setSelectMode(false);
            setSelected(new Set());
          }}
          actionLabel="Action"
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
    return (
      <div className="space-y-2 py-2" aria-busy="true">
        <span className="sr-only">Loading rooms…</span>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    );
  }

  if (rooms.error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 py-2">
        <p className="text-sm text-error-ink">Couldn't load rooms: {rooms.error.message}</p>
        <Button variant="ghost" size="sm" onClick={() => void rooms.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if ((rooms.data?.data.length ?? 0) === 0) {
    return (
      <p className="py-2 text-sm text-gray-ink">
        This property has no rooms yet. The landlord adds them from their property page.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {rooms.data!.data.map(room => (
        <li
          key={room.id}
          className="tabular grid grid-cols-2 items-center gap-x-4 gap-y-1 py-2.5 text-sm sm:grid-cols-[minmax(6rem,1fr)_minmax(9rem,1.4fr)_minmax(10rem,1.6fr)_auto_auto]"
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
          <span className="justify-self-start sm:justify-self-end">
            <StatusBadge status={room.status} />
          </span>
        </li>
      ))}
    </ul>
  );
}
