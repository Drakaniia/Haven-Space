/**
 * What the app does once a boarder has moved in, shown with the real boarder dashboard screenshot.
 * Each point maps to a boarder route that exists: payments, announcements + house rules, messages.
 */
const POINTS = [
  {
    title: 'Rent, on the record',
    body: 'See what is due and when. Every payment you log, and every one your landlord confirms, stays in your history.',
  },
  {
    title: 'House news in one place',
    body: 'Water interruptions, Wi-Fi changes and house rules are posted where you can find them again.',
  },
  {
    title: 'Talk to your landlord',
    body: 'Message the landlord directly instead of chasing them across group chats.',
  },
];

export function AfterMoveIn() {
  return (
    <section aria-labelledby="after-move-in-title" className="border-y border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8 lg:pt-28">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
          <div>
            <p className="kicker">After you move in</p>
            <h2 id="after-move-in-title" className="display-lg mt-3 max-w-2xl text-ink">
              Your tenancy lives here too, not just the listing.
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-gray-ink">
            Once a booking is confirmed, Haven becomes the place where you and your landlord keep
            track of rent, notices and messages for the whole stay.
          </p>
        </div>
      </div>

      {/* The screenshot carries its own transparent margin; the crop keeps the app in frame. */}
      <div className="mx-auto mt-10 max-w-[1400px] px-2 sm:px-6">
        <div className="aspect-[23/10] overflow-hidden">
          <img
            src="/assets/images/public/main.png"
            alt="The Haven Space boarder dashboard, showing lease progress, the next rent payment, room announcements and payment history"
            width={1905}
            height={1101}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <dl className="mt-10 grid gap-8 border-t border-border pt-8 sm:grid-cols-3 sm:gap-10">
          {POINTS.map(point => (
            <div key={point.title}>
              <dt className="font-semibold text-ink">{point.title}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-ink">{point.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
