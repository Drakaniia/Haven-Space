import { Link, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LandlordRoomList } from '../../components/rooms/LandlordRoomList';
import { getProperties } from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';
import type { LandlordProperty } from '../../lib/types';

export const Route = createFileRoute('/landlord/properties')({
  component: () => (
    <Protected role="landlord">
      <PropertiesPage />
    </Protected>
  ),
});

function AccessBadge({ role }: { role?: 'owner' | 'shared' }) {
  if (role === 'shared') {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
        Shared
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-mint px-2.5 py-0.5 text-xs font-medium text-primary-dark">
      Owned
    </span>
  );
}

function PropertiesPage() {
  const { token } = useAuth();
  const properties = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: () => getProperties(token!),
    enabled: Boolean(token),
  });

  return (
    <RoleShell title="My properties" nav={LANDLORD_NAV}>
      <div className="mb-5 flex items-center gap-3">
        <Icon name="buildingOffice" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-ink">My properties</h2>
          <p className="text-sm text-gray-ink">All the properties you manage.</p>
        </div>
      </div>
      {properties.isLoading ? (
        <Spinner />
      ) : properties.error ? (
        <ErrorState message={properties.error.message} />
      ) : properties.data && properties.data.data.properties.length > 0 ? (
        <DataTable<LandlordProperty>
          rows={properties.data.data.properties}
          keyFor={row => row.id}
          expandable={row => <LandlordRoomList token={token!} propertyId={row.id} />}
          columns={[
            {
              header: 'Name',
              cell: row => (
                <Link
                  to="/landlord/listings/$id/edit"
                  params={{ id: String(row.id) }}
                  className="font-medium text-primary hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            { header: 'Address', cell: row => `${row.address}, ${row.city}` },
            {
              header: 'Access',
              cell: row => <AccessBadge role={row.role} />,
            },
            {
              header: 'Status',
              cell: row => <StatusBadge status={row.status} />,
            },
            {
              header: 'Rooms',
              cell: row => `${row.occupied_rooms}/${row.total_rooms}`,
            },
          ]}
        />
      ) : (
        <EmptyState
          title="No properties yet"
          description={
            <>
              Create your first listing to start renting rooms.{' '}
              <Link to="/landlord/listings/create" className="text-primary hover:underline">
                Create a listing
              </Link>
            </>
          }
        />
      )}
    </RoleShell>
  );
}
