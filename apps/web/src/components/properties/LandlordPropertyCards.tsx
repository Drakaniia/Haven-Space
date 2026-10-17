import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { getProperties } from '../../lib/api/landlord';
import { ErrorState } from '../ui/ErrorState';
import { isFullProperty } from '../../lib/listing-status';
import {
  PropertyCard,
  PropertyCardList,
  PropertyCardSkeletonList,
  landlordFacts,
  listingPill,
  propertyAddress,
} from './PropertyCard';

/**
 * The landlord property card list — the single property list, rendered by
 * `/landlord/properties`. The `/landlord/listings` page that used to duplicate
 * it was removed (`landlord-property-detail-page` D2/R2).
 *
 * A card is now a **pure entry point** (D3/D13/R15): it opens the property
 * detail page and nothing else. Everything that used to hang off the card has a
 * proper home — the inline rooms accordion became the property's rooms page,
 * and the delete flow moved into the detail page's destructive zone (D18).
 */
export function LandlordPropertyCards({ token, empty }: { token: string; empty: ReactNode }) {
  const properties = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: () => getProperties(token),
    enabled: Boolean(token),
  });

  if (properties.isLoading) {
    return <PropertyCardSkeletonList />;
  }

  if (properties.error) {
    return <ErrorState message={properties.error.message} />;
  }

  const rows = properties.data?.data.properties ?? [];

  if (rows.length === 0) {
    return <>{empty}</>;
  }

  return (
    <PropertyCardList>
      {rows.map(property => (
        <PropertyCard
          key={property.id}
          title={property.name}
          propertyId={property.id}
          imageUrl={property.photos[0] ?? null}
          pill={listingPill(property.status, property.listing_moderation_status)}
          // Occupancy is a fact, not a status: a full property keeps its own
          // Draft/Published/Unpublished pill and gains this beside it (D16).
          badge={
            isFullProperty(property.total_rooms, property.occupied_rooms) ? 'Full' : undefined
          }
          address={propertyAddress(property)}
          facts={landlordFacts(property)}
          note={property.role === 'shared' ? 'Shared access' : undefined}
        />
      ))}
    </PropertyCardList>
  );
}
