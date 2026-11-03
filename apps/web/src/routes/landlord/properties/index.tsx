import { Link, createFileRoute } from '@tanstack/react-router';
import { LandlordPropertyCards } from '../../../components/properties/LandlordPropertyCards';
import { buttonClasses } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Icon } from '../../../components/ui/Icon';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { useAuth } from '../../../lib/auth-context';

export const Route = createFileRoute('/landlord/properties/')({
  component: PropertiesPage,
});

/**
 * Shell comes from the `/landlord/properties` layout route (`properties.tsx`) —
 * this page renders its heading and the shared property card list only.
 *
 * This is now the **single** property list: the `/landlord/listings` page it
 * duplicated was removed (`landlord-property-detail-page` D2/R2). Creating a
 * listing still lives at `/landlord/listings/create`.
 */
function PropertiesPage() {
  const { token } = useAuth();

  return (
    <div>
      <PageHeader
        title="My properties"
        subtitle="Every house you manage. Open one to edit its listing, rooms and applications."
        actions={
          <Link to="/landlord/listings/create" className={buttonClasses()}>
            <Icon name="plus" size={16} />
            Create listing
          </Link>
        }
      />

      {token ? (
        <LandlordPropertyCards
          token={token}
          empty={
            <EmptyState
              icon="buildingOffice"
              title="No properties yet"
              description="Create your first listing — add the house, its rooms and a few photos, then publish when you're ready."
              action={
                <Link to="/landlord/listings/create" className={buttonClasses()}>
                  Create a listing
                </Link>
              }
            />
          }
        />
      ) : (
        <Spinner />
      )}
    </div>
  );
}
