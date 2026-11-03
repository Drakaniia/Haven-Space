import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { PropertyDetailHeader } from '../../../../components/properties/PropertyDetailHeader';
import {
  PropertyDetailsCard,
  PublicListingCard,
  RoomSummaryCard,
} from '../../../../components/properties/PropertyOverview';
import { PropertyPublicListing } from '../../../../components/properties/PropertyPublicListing';
import { PropertyTabs } from '../../../../components/properties/PropertyTabs';
import { Button, buttonClasses } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Spinner } from '../../../../components/ui/Spinner';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { ToastStack, useToasts } from '../../../../components/ui/Toast';
import { deleteProperty, getApplications, getProperty } from '../../../../lib/api/landlord';
import { ApiRequestError } from '../../../../lib/api/http';
import { useAuth } from '../../../../lib/auth-context';
import {
  DEFAULT_PROPERTY_TAB,
  toPropertyTabKey,
  type PropertyTabKey,
} from '../../../../lib/property-tabs';
import { publicDetailPath } from '../../../../lib/routes';
import { setPendingToast } from '../../../../lib/toast';
import {
  formatCardDate,
  propertyAddress,
  roomsLabel,
} from '../../../../components/properties/PropertyCard';
import { Icon } from '../../../../components/ui/Icon';
import {
  isFullProperty,
  listingStatusPill,
  listingStatusTone,
} from '../../../../lib/listing-status';

export const Route = createFileRoute('/landlord/properties/$id/')({
  // Non-throwing, like the admin console's `toAdminSectionKey`: an absent or
  // unrecognised `?tab=` lands on Overview, never on a blank pane (R6).
  //
  // A concrete key is returned for **every** input — including the default. An
  // earlier version omitted `tab` when it equalled the default, which let the
  // raw param leak through unresolved (an unknown value then rendered no pane at
  // all). The declared type stays optional so `Link`s elsewhere are not forced
  // to spell out a `search` prop; the guard `?? DEFAULT_PROPERTY_TAB` in the
  // component still holds for a route reached without this validator.
  validateSearch: (search: Record<string, unknown>): { tab?: PropertyTabKey } => ({
    tab: toPropertyTabKey(search?.tab),
  }),
  component: PropertyDetailPage,
});

function PropertyDetailPage() {
  const { id } = Route.useParams();
  const tab = Route.useSearch().tab ?? DEFAULT_PROPERTY_TAB;
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, push, dismiss } = useToasts();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const propertyId = Number(id);

  const property = useQuery({
    queryKey: ['landlord-property', propertyId],
    queryFn: () => getProperty(token!, propertyId),
    enabled: Boolean(token),
  });

  // `rooms` is a valid key but no longer a tab (D26): rooms live on their own
  // page, so a hand-typed or bookmarked `?tab=rooms` is forwarded there instead
  // of being silently reinterpreted as Overview.
  const redirectingToRooms = tab === 'rooms';
  useEffect(() => {
    if (!redirectingToRooms) return;
    void navigate({
      to: '/landlord/properties/$id/rooms',
      params: { id: String(propertyId) },
      replace: true,
    });
  }, [redirectingToRooms, propertyId, navigate]);

  const removeProperty = useMutation({
    mutationFn: () => deleteProperty(token!, propertyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
      setPendingToast('success', 'Property deleted.');
      void navigate({ to: '/landlord/properties' });
    },
    onError: error => {
      setConfirmDelete(false);
      push({
        tone: 'error',
        message:
          error instanceof ApiRequestError ? error.message : 'Failed to delete the property.',
      });
    },
  });

  if (property.isLoading) return <Spinner />;
  if (property.error) return <ErrorState message={property.error.message} />;

  const detail = property.data?.data;
  if (!detail) return <ErrorState message="Property not found." />;

  return (
    <div>
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <PropertyDetailHeader
        propertyId={detail.id}
        name={detail.name}
        imageUrl={detail.photos?.[0] ?? null}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <StatusBadge
                status={listingStatusTone(detail.status, detail.listing_moderation_status)}
                label={listingStatusPill(detail.status, detail.listing_moderation_status).label}
              />
              {isFullProperty(detail.total_rooms, detail.occupied_rooms) ? (
                <StatusBadge status="full" label="Full" />
              ) : null}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <Icon name="pin" size={14} className="shrink-0 text-muted" />
              <span className="truncate">{propertyAddress(detail)}</span>
            </span>
            <span className="tabular">{roomsLabel(Number(detail.total_rooms ?? 0))}</span>
          </>
        }
        action={
          <>
            {/* The public page lives outside the landlord shell, so it opens
                beside this one rather than replacing it (D17/R12). */}
            <a
              href={publicDetailPath(detail.id)}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: 'outline' })}
            >
              Preview listing
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <Link
              to="/landlord/listings/$id/edit"
              params={{ id: String(detail.id) }}
              className={buttonClasses()}
            >
              Edit listing
            </Link>
          </>
        }
      />

      <PropertyTabs propertyId={detail.id} active={tab} />

      {redirectingToRooms ? null : (
        <>
          {tab === 'overview' ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <PropertyDetailsCard detail={detail} />
                <PublicListingCard detail={detail} />
              </div>
              <RoomSummaryCard detail={detail} />
            </div>
          ) : null}

          {tab === 'public-listing' ? <PropertyPublicListing detail={detail} /> : null}

          {tab === 'applications' ? (
            <PropertyApplications token={token!} propertyId={detail.id} />
          ) : null}
        </>
      )}

      {/*
        Destructive zone (D18/R14): the only place a property can be deleted now
        that the card list no longer carries an overflow menu.
      */}
      <section
        aria-labelledby="danger-zone"
        className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-error-border bg-surface px-5 py-4"
      >
        <div className="min-w-0 max-w-xl">
          <h2 id="danger-zone" className="text-sm font-semibold text-error-ink">
            Danger zone
          </h2>
          <p className="mt-1 text-sm text-gray-ink">
            Deleting removes <strong className="font-medium text-ink">{detail.name}</strong> and
            all of its rooms from Haven Space. This cannot be undone.
          </p>
        </div>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          Delete property
        </Button>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete property"
        message={
          <>
            Delete <strong>{detail.name}</strong> and its rooms? This cannot be undone.
          </>
        }
        confirmLabel="Delete property"
        busy={removeProperty.isPending}
        onConfirm={() => removeProperty.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

/**
 * This property's applications (D21/R9).
 *
 * `GET /api/landlord/applications` returns every application the landlord can
 * access — each row already carries `property_id` — and takes no query
 * parameters, so the scoping happens here.
 */
function PropertyApplications({ token, propertyId }: { token: string; propertyId: number }) {
  const applications = useQuery({
    queryKey: ['landlord-applications'],
    queryFn: () => getApplications(token),
    enabled: Boolean(token),
  });

  if (applications.isLoading) return <Spinner />;
  if (applications.error) return <ErrorState message={applications.error.message} />;

  const rows = (applications.data?.data ?? []).filter(
    row => Number(row.property_id) === propertyId
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="application"
        title="No applications yet"
        description="Applications boarders send for this property will appear here."
      />
    );
  }

  return (
    <Card padding="p-0">
      <ul className="divide-y divide-border">
        {rows.map(row => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {[row.first_name, row.last_name].filter(Boolean).join(' ')}
              </p>
              <p className="mt-0.5 text-xs text-gray-ink">
                {row.room_title ?? 'Room'} · applied {formatCardDate(row.created_at)}
              </p>
            </div>
            <StatusBadge status={row.status} />
          </li>
        ))}
      </ul>
      <div className="border-t border-border px-5 py-3">
        <Link
          to="/landlord/applications"
          className={buttonClasses({ variant: 'ghost', size: 'sm' })}
        >
          Manage all applications
          <Icon name="chevronRight" size={14} />
        </Link>
      </div>
    </Card>
  );
}
