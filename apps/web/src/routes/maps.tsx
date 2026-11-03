import { createFileRoute } from '@tanstack/react-router';
import { PublicLayout } from '../components/layout/PublicLayout';
import { LOCATION_SUBTITLE, MapEmbed, mapSubtitle } from '../components/rooms/MapEmbed';
import { MapLocationControl } from '../components/rooms/MapLocationControl';
import { PageHeader } from '../components/ui/PageHeader';
import { mapUrlForCoordinates } from '../lib/maps';
import { useMapLocation } from '../lib/use-map-location';

export const Route = createFileRoute('/maps')({
  component: MapsPage,
});

function MapsPage() {
  const location = useMapLocation();
  const pin = location.coordinates;
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PageHeader title="Explore the map" subtitle={pin ? LOCATION_SUBTITLE : mapSubtitle()} />
        <MapLocationControl state={location} />
        <MapEmbed
          title="Haven Space map"
          heightClass="h-[60vh] sm:h-[70vh]"
          url={pin ? mapUrlForCoordinates(pin.latitude, pin.longitude) : undefined}
        />
      </div>
    </PublicLayout>
  );
}
