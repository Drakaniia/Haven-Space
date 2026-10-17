import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { MapEmbed } from '../../components/rooms/MapEmbed';
import { MapLocationControl } from '../../components/rooms/MapLocationControl';
import { PageHeader } from '../../components/ui/PageHeader';
import { mapUrlForCoordinates } from '../../lib/maps';
import { LANDLORD_NAV } from '../../lib/nav';
import { useMapLocation } from '../../lib/useMapLocation';

export const Route = createFileRoute('/landlord/maps')({
  component: LandlordMapsPage,
});

function LandlordMapsPage() {
  const location = useMapLocation();
  const pin = location.coordinates;
  return (
    <Protected role="landlord">
      <RoleShell nav={LANDLORD_NAV}>
        <PageHeader icon="map" title="Property map view" />
        <MapLocationControl state={location} />
        <MapEmbed
          title="Haven Space map"
          heightClass="h-[70vh] sm:h-[80vh]"
          url={pin ? mapUrlForCoordinates(pin.latitude, pin.longitude) : undefined}
        />
      </RoleShell>
    </Protected>
  );
}
