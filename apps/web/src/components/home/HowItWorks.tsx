import { Link } from '@tanstack/react-router';

/**
 * The real renting flow, in the order the app walks a boarder through it:
 * `/find-a-room` → tour request → application → booking → rent logged in `/boarder/payments`.
 */
const STEPS = [
  {
    title: 'Search',
    body: 'Look through rooms by area, school or budget, or open the map to see what is close to where you study or work.',
  },
  {
    title: 'Visit',
    body: 'Request a tour from any listing. The landlord confirms a time, and you get to see the room, the street and the house rules for yourself.',
  },
  {
    title: 'Apply',
    body: 'Send an application when you are ready. Once the landlord accepts it, you confirm the booking in the app.',
  },
  {
    title: 'Move in and pay rent',
    body: 'Pay your landlord by GCash, bank transfer or cash, then log it with the reference. Your landlord confirms it, and you both keep the same record.',
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-title" className="bg-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-8 lg:py-28">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="kicker">How renting through Haven works</p>
          <h2 id="how-it-works-title" className="display-lg mt-3 text-ink">
            From first search to first rent, in four steps.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-gray-ink">
            Browsing is open to everyone. You will need a boarder account to request a tour, apply
            or log a payment.
          </p>
          <Link
            to="/find-a-room"
            className="mt-6 inline-flex text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
          >
            Start browsing rooms
          </Link>
        </div>

        <ol className="border-t border-border">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 border-b border-border py-7 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-6 sm:py-9"
            >
              <span
                aria-hidden="true"
                className="font-display text-[2.5rem] font-medium leading-none tracking-[-0.03em] text-primary/70 tabular sm:text-[3.25rem]"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="font-display text-[1.375rem] font-medium leading-tight tracking-[-0.015em] text-ink sm:text-2xl">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xl leading-relaxed text-gray-ink">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
