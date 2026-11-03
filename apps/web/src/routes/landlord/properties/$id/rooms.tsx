import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PropertyDetailHeader } from '../../../../components/properties/PropertyDetailHeader';
import { PropertyRoomsGrid } from '../../../../components/rooms/PropertyRoomsGrid';
import { Button } from '../../../../components/ui/Button';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Spinner } from '../../../../components/ui/Spinner';
import { getProperty } from '../../../../lib/api/landlord';
import { useAuth } from '../../../../lib/auth-context';

export const Route = createFileRoute('/landlord/properties/$id/rooms')({
  component: PropertyRoomsPage,
});

/**
 * A property's rooms (`landlord-property-detail-page` D8/D9/R11,
 * `landlord-rooms-grid`).
 *
 * Still its own page rather than a section of the listing edit form — managing
 * rooms is not the same thing as editing basic information, pricing and status.
 * It is now the picture-matched layout: the page header owns the `+ Add room`
 * action (D2), and `PropertyRoomsGrid` renders the stat cards, the status /
 * search / sort toolbar and one card per room (D1). `LandlordRoomList` continues
 * to serve the surfaces that were not redesigned.
 */
function PropertyRoomsPage() {
  const { id } = Route.useParams();
  const { token } = useAuth();
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const propertyId = Number(id);

  const property = useQuery({
    queryKey: ['landlord-property', propertyId],
    queryFn: () => getProperty(token!, propertyId),
    enabled: Boolean(token),
  });

  if (property.isLoading) return <Spinner />;
  if (property.error) return <ErrorState message={property.error.message} />;

  const detail = property.data?.data;
  if (!detail) return <ErrorState message="Property not found." />;

  return (
    <div>
      <PropertyDetailHeader
        propertyId={detail.id}
        name={detail.name}
        trailTail="Rooms"
        action={<Button onClick={() => setAddRoomOpen(true)}>+ Add room</Button>}
      />
      <PropertyRoomsGrid
        token={token!}
        propertyId={detail.id}
        addOpen={addRoomOpen}
        onAddOpenChange={setAddRoomOpen}
      />
    </div>
  );
}
