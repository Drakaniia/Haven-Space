import { createFileRoute, Link } from '@tanstack/react-router';
import { PublicLayout } from '../components/layout/PublicLayout';
import { buttonClasses } from '../components/ui/Button';

export const Route = createFileRoute('/our-story')({
  component: OurStoryPage,
});

/** The problems Haven Space was built around, each paired with the feature that answers it. */
const PROBLEMS = [
  {
    problem: 'You cannot tell whether a listing is real.',
    answer:
      'Landlords upload their ID, proof of ownership and business permit, and an admin checks them before any room goes live.',
  },
  {
    problem: 'You only see the room once you have already said yes.',
    answer: 'Boarders request a tour from the listing and visit before they apply.',
  },
  {
    problem: 'Rent lives in a notebook, and the notebook only has one side.',
    answer:
      'Boarders log each payment with its reference; landlords confirm it. Both see the same history.',
  },
  {
    problem: 'House notices get buried in group chats.',
    answer: 'Announcements and house rules stay pinned where every boarder can find them.',
  },
];

const PRINCIPLES = [
  {
    title: 'Real listings only',
    body: 'No room is published until the person behind it has been checked.',
  },
  {
    title: 'One record, two sides',
    body: 'Landlords and boarders look at the same payments and the same notices.',
  },
  {
    title: 'Plain language',
    body: 'Prices, house rules and due dates written so anyone can read them on a phone.',
  },
  {
    title: 'Made for small houses',
    body: 'Most boarding houses are run by one family. The tools should fit that, not a property firm.',
  },
];

function OurStoryPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="paper-grain border-b border-border">
        <div className="rise-in mx-auto max-w-4xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:pb-20 lg:pt-24">
          <p className="kicker">Our story</p>
          <h1 className="display-xl mt-4 text-ink">
            We started by <span className="text-clay">listening.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-ink sm:text-xl">
            Haven Space began with one of us trying to find a safe, decent boarding house near
            school, and finding out how hard that is. Before building anything, we went and asked
            the people who live it: boarders looking for rooms, and the landlords who keep those
            houses running.
          </p>
        </div>
      </section>

      {/* Field notes */}
      <section aria-labelledby="field-notes-title" className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-8">
            <figure>
              <img
                src="/assets/images/landlord_interview.jpg"
                alt="A member of the team listening to a landlord in the garden of her boarding house"
                width={2048}
                height={1536}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-2xl border border-border object-cover shadow-card"
              />
              <figcaption className="mt-3 text-sm text-gray-ink">
                Interviewing a boarding-house landlord at her home.
              </figcaption>
            </figure>
            <figure className="md:mt-24">
              <img
                src="/assets/images/boarder_interview.jpg"
                alt="Two young men talking outside the gate of a boarding house"
                width={2048}
                height={1536}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-2xl border border-border object-cover shadow-card"
              />
              <figcaption className="mt-3 text-sm text-gray-ink">
                Interviewing a boarder about his last room search.
              </figcaption>
            </figure>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
            <h2 id="field-notes-title" className="display-lg text-ink">
              The problems we set out to fix
            </h2>
            <div className="prose-haven text-lg">
              <p>
                They are ordinary problems. Boarders struggle to tell which listings are real, or to
                see a room before committing to it. Landlords track rent by hand and post notices in
                group chats that nobody scrolls back through.
              </p>
              <p>
                None of that needed a clever idea. It needed a few ordinary tools, built carefully,
                that both sides could trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem → response */}
      <section aria-labelledby="built-title" className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <p className="kicker">What we built</p>
          <h2 id="built-title" className="display-lg mt-3 max-w-2xl text-ink">
            Each feature answers a specific problem.
          </h2>
          <dl className="mt-12 border-t border-border">
            {PROBLEMS.map(item => (
              <div
                key={item.problem}
                className="grid gap-3 border-b border-border py-7 md:grid-cols-2 md:gap-12 md:py-9"
              >
                <dt className="font-display text-xl font-medium leading-snug tracking-[-0.015em] text-ink sm:text-2xl">
                  {item.problem}
                </dt>
                <dd className="leading-relaxed text-gray-ink md:pt-1">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Principles */}
      <section aria-labelledby="principles-title" className="bg-cream">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16 lg:px-8 lg:py-28">
          <div>
            <p className="kicker">How we decide</p>
            <h2 id="principles-title" className="display-lg mt-3 text-ink">
              Four rules we hold ourselves to
            </h2>
          </div>
          <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {PRINCIPLES.map((principle, index) => (
              <li key={principle.title} className="border-t border-border-strong pt-5">
                <span aria-hidden="true" className="text-sm font-semibold text-primary tabular">
                  {index + 1}.
                </span>
                <h3 className="mt-1 text-lg font-semibold text-ink">{principle.title}</h3>
                <p className="mt-2 leading-relaxed text-gray-ink">{principle.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Join */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8 lg:py-20">
          <div className="max-w-xl">
            <h2 className="display-md text-ink">This is still a small project, and that is on purpose.</h2>
            <p className="mt-3 leading-relaxed text-gray-ink">
              Haven Space is built by a team of four.{' '}
              <Link
                to="/teams"
                className="font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
              >
                Meet the team
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/find-a-room" className={buttonClasses({ size: 'lg' })}>
              Find a room
            </Link>
            <Link to="/for-landlords" className={buttonClasses({ variant: 'outline', size: 'lg' })}>
              List your rooms
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
