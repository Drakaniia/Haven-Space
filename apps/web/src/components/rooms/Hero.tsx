import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { buttonClasses } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { MapModal } from './MapModal';

/**
 * The home hero. Its "View map" affordance opens the map dialog in place instead of navigating away
 * (spec `hero-map-modal`).
 *
 * The dialog is `viewOnly`: the home page is public, so it must never ask for a position — it is the
 * same panel `/find-a-room` opens, minus the location wiring. Nothing map-related runs until the
 * button is clicked, because `MapModal` only mounts its body while the dialog is open. (The scan in
 * `test/maps.test.ts` asserts the absence, so this comment is kept free of the identifiers.)
 *
 * Layout: an asymmetric split — the headline and the two actions on the left, a real photo from our
 * landlord interviews on the right, with one honest fact pinned to its corner.
 */
export function Hero() {
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <section className="paper-grain border-b border-border">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="rise-in max-w-xl">
          <p className="kicker">For students and young professionals</p>
          <h1 className="display-xl mt-4 text-ink">
            Find your haven, <span className="text-clay">right next door.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-gray-ink">
            Browse boarding houses near your school or work, visit before you commit, and keep your
            rent records in one place, with landlords whose documents we have checked.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/find-a-room" className={buttonClasses({ size: 'lg' })}>
              Find a room
            </Link>
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              aria-haspopup="dialog"
              className={buttonClasses({ variant: 'outline', size: 'lg' })}
            >
              <Icon name="map" size={18} />
              View map
            </button>
          </div>
          <p className="mt-6 text-sm text-gray-ink">
            Not sure what to look for?{' '}
            <Link
              to="/haven-ai"
              className="font-semibold text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
            >
              Ask Haven AI
            </Link>
          </p>
        </div>

        <figure className="mx-auto w-full max-w-xl lg:max-w-none">
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border bg-subtle shadow-card">
              <img
                src="/assets/images/landlord_interview.jpg"
                alt="A member of the Haven Space team listening to a boarding-house landlord in her garden"
                width={2048}
                height={1536}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-lift sm:absolute sm:-bottom-6 sm:-left-6 sm:mt-0 sm:max-w-[17rem] lg:-left-10">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-primary">
                <Icon name="shieldCheck" size={18} />
              </span>
              <p className="text-sm leading-snug text-ink">
                Before a landlord can list a room, an admin reviews their documents.
              </p>
            </div>
          </div>
          <figcaption className="mt-3 text-sm text-gray-ink sm:ml-auto sm:max-w-[45%] sm:text-right">
            We started by sitting down with landlords and boarders before writing any code.
          </figcaption>
        </figure>
      </div>
      <MapModal open={mapOpen} onClose={() => setMapOpen(false)} viewOnly />
    </section>
  );
}
