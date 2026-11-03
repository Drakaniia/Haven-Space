import { createFileRoute, Link } from '@tanstack/react-router';
import { PublicLayout } from '../components/layout/PublicLayout';
import { LOCATION_SUBTITLE, MapEmbed, mapSubtitle } from '../components/rooms/MapEmbed';
import { MapLocationControl } from '../components/rooms/MapLocationControl';
import { buttonClasses } from '../components/ui/Button';
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
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <PageHeader
          title="Explore the map"
          subtitle={pin ? LOCATION_SUBTITLE : mapSubtitle()}
          actions={
            // The control owns a bottom margin for its stacked layout; cancel it in the header row.
            <div className="-mb-4">
              <MapLocationControl state={location} />
            </div>
          }
        />

        <div className="overflow-hidden rounded-2xl border border-border bg-subtle shadow-card [&>iframe]:block [&>iframe]:rounded-none [&>iframe]:shadow-none">
          <MapEmbed
            title="Haven Space map"
            heightClass="h-[60vh] sm:h-[70vh]"
            url={pin ? mapUrlForCoordinates(pin.latitude, pin.longitude) : undefined}
          />
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="max-w-xl text-[0.9375rem] leading-relaxed text-gray-ink">
            The map is for getting a feel for the area. For rooms with prices, photos and
            availability, browse the listings.
          </p>
          <Link to="/find-a-room" className={buttonClasses({ variant: 'outline' })}>
            Browse rooms
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
