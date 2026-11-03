import { createFileRoute, Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { ActivityFeedRow } from '../../components/landlord/dashboard/ActivityFeedRow';
import { Button, buttonClasses } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, SelectInput } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { getLandlordActivity } from '../../lib/api/activity';
import { getProperties } from '../../lib/api/landlord';
import { activityWindow } from '../../lib/activity';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/activity')({
  component: () => (
    <Protected role="landlord">
      <RoleShell nav={LANDLORD_NAV}>
        <ActivityPage />
      </RoleShell>
    </Protected>
  ),
});

const RANGES = [7, 30, 90] as const;
type RangeDays = (typeof RANGES)[number];
type FamilyKey = 'all' | 'money' | 'applications' | 'tenancy' | 'content';

const FAMILY_LABELS: Array<{ value: FamilyKey; label: string }> = [
  { value: 'all', label: 'All activity' },
  { value: 'applications', label: 'Applications' },
  { value: 'money', label: 'Payments' },
  { value: 'tenancy', label: 'Tenancy' },
  { value: 'content', label: 'Content' },
];

function toRange(value: string | null): RangeDays {
  const parsed = Number(value);

  return RANGES.includes(parsed as RangeDays) ? (parsed as RangeDays) : 30;
}

function toFamily(value: string | null): FamilyKey {
  return FAMILY_LABELS.some(entry => entry.value === value) ? (value as FamilyKey) : 'all';
}

function useActivityFilters() {
  const location = useLocation() as unknown as { searchStr?: string; href?: string };
  const navigate = useNavigate();
  const raw =
    typeof location.searchStr === 'string'
      ? location.searchStr
      : (location.href ?? '').split('?')[1] ?? '';
  const params = new URLSearchParams(raw);

  const range = toRange(params.get('range'));
  const family = toFamily(params.get('family'));
  const propertyId = params.get('propertyId') ?? '';

  const update = (next: { range?: RangeDays; family?: FamilyKey; propertyId?: string }) => {
    const merged = { range, family, propertyId, ...next };
    const search = new URLSearchParams();

    if (merged.range !== 30) search.set('range', String(merged.range));
    if (merged.family !== 'all') search.set('family', merged.family);
    if (merged.propertyId) search.set('propertyId', merged.propertyId);

    void navigate({
      to: '/landlord/activity',
      search: Object.fromEntries(search) as never,
    });
  };

  return { range, family, propertyId, update };
}

function ActivityPage() {
  const { token } = useAuth();
  const { range, family, propertyId, update } = useActivityFilters();
  const { from, to } = activityWindow(range);

  const properties = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: () => getProperties(token!),
    enabled: Boolean(token),
  });

  const propertyList = properties.data?.data.properties ?? [];
  const activePropertyId = propertyId ? Number(propertyId) : null;

  const activity = useInfiniteQuery({
    queryKey: ['landlord-activity', { from, to, propertyId, family }],
    queryFn: ({ pageParam }) =>
      getLandlordActivity(token!, {
        from,
        to,
        propertyId: activePropertyId,
        types: family === 'all' ? null : [family],
        limit: 20,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: last => (last.data.has_more ? last.data.next_offset ?? undefined : undefined),
    enabled: Boolean(token),
  });

  const events = activity.data?.pages.flatMap(page => page.data.events) ?? [];
  const total = activity.data?.pages[0]?.data.total ?? 0;
  const truncated = activity.data?.pages.some(page => page.data.truncated) ?? false;
  const filtersActive = family !== 'all' || Boolean(propertyId) || range !== 30;

  return (
    <>
      <PageHeader icon="analytics" title="Activity" />

      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Property" htmlFor="activity-property">
            <SelectInput
              id="activity-property"
              value={propertyId}
              onChange={event => update({ propertyId: event.target.value })}
            >
              <option value="">All properties</option>
              {propertyList.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Activity type" htmlFor="activity-family">
            <SelectInput
              id="activity-family"
              value={family}
              onChange={event => update({ family: event.target.value as FamilyKey })}
            >
              {FAMILY_LABELS.map(entry => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Date range" htmlFor="activity-range">
            <SelectInput
              id="activity-range"
              value={String(range)}
              onChange={event => update({ range: toRange(event.target.value) })}
            >
              {RANGES.map(days => (
                <option key={days} value={days}>
                  Last {days} days
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </Card>

      {activity.isLoading ? (
        <Card>
          <div className="divide-y divide-border">
            {[0, 1, 2, 3, 4, 5].map(index => (
              <div key={index} className="flex items-center justify-between gap-4 py-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </Card>
      ) : activity.error ? (
        <ErrorState
          message={activity.error.message}
          action={
            <Button size="sm" variant="outline" onClick={() => void activity.refetch()}>
              Try again
            </Button>
          }
        />
      ) : properties.data && propertyList.length === 0 ? (
        <EmptyState
          icon="buildingOffice"
          title="No properties yet"
          description="Create a listing to start seeing applications, payments, and tenancy activity."
          action={
            <Link to="/landlord/listings/create" className={buttonClasses()}>
              Create a listing
            </Link>
          }
        />
      ) : events.length === 0 ? (
        <EmptyState
          icon="analytics"
          title="No activity in this range"
          description="Try a wider date range or clear the filters."
          action={
            filtersActive ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => update({ range: 30, family: 'all', propertyId: '' })}
              >
                Reset filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {events.map(event => (
              <ActivityFeedRow key={event.id} event={event} showContext showLink />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-gray-ink">
              Showing {events.length} of {total}
              {truncated ? ' · capped at the most recent 1,000 events in this range' : ''}
            </p>
            {activity.hasNextPage ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void activity.fetchNextPage()}
                disabled={activity.isFetchingNextPage}
              >
                {activity.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            ) : null}
          </div>
        </Card>
      )}
    </>
  );
}
