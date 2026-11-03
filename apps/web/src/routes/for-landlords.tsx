import { createFileRoute, Link } from '@tanstack/react-router';
import { PublicLayout } from '../components/layout/PublicLayout';
import { buttonClasses } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

export const Route = createFileRoute('/for-landlords')({
  component: ForLandlordsPage,
});

/** The landlord workspace as it exists today (see `LANDLORD_NAV`). */
const WORKSPACE = [
  { icon: 'buildingOffice', label: 'Properties and rooms' },
  { icon: 'calendar', label: 'Tour calendar' },
  { icon: 'application', label: 'Applications' },
  { icon: 'users', label: 'Boarders' },
  { icon: 'payment', label: 'Rent and receipts' },
  { icon: 'announcement', label: 'Announcements' },
  { icon: 'chat', label: 'Messages' },
];

/** The four documents `/landlord/verification` asks for. */
const DOCUMENTS = [
  'A valid government-issued ID',
  'Proof that you own the property',
  'Your business permit',
  'A selfie holding your ID',
];

const SETUP = [
  {
    title: 'Create your account',
    body: 'Sign up as a landlord and tell us a little about you and your first property.',
  },
  {
    title: 'Get verified',
    body: 'Upload the four documents below. An admin reviews them, usually within 24 to 48 hours.',
  },
  {
    title: 'Add your rooms',
    body: 'Set up the property, then each room with its price, photos and what is included.',
  },
  {
    title: 'Take tours and applications',
    body: 'Boarders request visits and apply from your listing. You accept, decline or reply from one list.',
  },
];

const TOOLS = [
  {
    icon: 'application',
    title: 'Applications in one list',
    body: 'No more scrolling back through texts to find who asked first. Every application sits in one place, and you accept or decline with a click.',
  },
  {
    icon: 'calendar',
    title: 'Tours on a calendar',
    body: 'Tour requests land on your calendar with the room and the boarder attached, so you can see the week at a glance.',
  },
  {
    icon: 'payment',
    title: 'Rent you can reconcile',
    body: 'Boarders log GCash and bank payments with a reference and receipt; you confirm them, or record cash yourself. You can see who is paid, who is due and who is late.',
  },
  {
    icon: 'announcement',
    title: 'Notices that reach everyone',
    body: 'Post a water interruption or a house-rule change once, and every boarder in the house sees it. Message anyone directly when it is just for them.',
  },
];

const INCLUDED = [
  'Unlimited properties and rooms',
  'Tour requests and calendar',
  'Application management',
  'Boarder records',
  'Rent tracking with receipts',
  'Announcements and messages',
];

function ForLandlordsPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="paper-grain border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="rise-in max-w-2xl">
            <p className="kicker">For landlords</p>
            <h1 className="display-xl mt-4 text-ink">Run your boarding house from one place.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-ink">
              List rooms, schedule tours, review applications and keep track of rent, with the same
              records your boarders see. Built with landlords who were tired of notebooks and group
              chats.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth/signup/landlord" className={buttonClasses({ size: 'lg' })}>
                Create a landlord account
              </Link>
              <a href="#pricing" className={buttonClasses({ variant: 'outline', size: 'lg' })}>
                See pricing
              </a>
            </div>
          </div>

          <aside
            aria-label="What your workspace includes"
            className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-7"
          >
            <p className="text-sm font-semibold text-ink">Your workspace</p>
            <ul className="mt-4 divide-y divide-border">
              {WORKSPACE.map(item => (
                <li key={item.label} className="flex items-center gap-3 py-3 text-[0.9375rem]">
                  <Icon name={item.icon} size={18} className="text-primary" />
                  <span className="text-ink">{item.label}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {/* Setup */}
      <section id="verification" aria-labelledby="setup-title" className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <p className="kicker">Getting set up</p>
            <h2 id="setup-title" className="display-lg mt-3 text-ink">
              Verified first, so boarders can trust the listing.
            </h2>
          </div>

          <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {SETUP.map((step, index) => (
              <li key={step.title} className="border-t-2 border-ink pt-5">
                <span
                  aria-hidden="true"
                  className="font-display text-sm font-medium text-gray-ink tabular"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 font-display text-xl font-medium tracking-[-0.015em] text-ink">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-gray-ink">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 grid gap-6 rounded-2xl border border-border bg-surface p-6 sm:p-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10">
            <div>
              <h3 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">
                What verification asks for
              </h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-gray-ink">
                You can explore the dashboard straight away. Listings can be published once an admin
                has approved these.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {DOCUMENTS.map(doc => (
                <li
                  key={doc}
                  className="flex items-start gap-3 rounded-xl bg-subtle px-4 py-3 text-[0.9375rem] text-ink"
                >
                  <Icon name="document" size={18} className="mt-0.5 text-primary" />
                  {doc}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Tools */}
      <section aria-labelledby="tools-title" className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16 lg:px-8 lg:py-28">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="kicker">Day to day</p>
            <h2 id="tools-title" className="display-lg mt-3 text-ink">
              The jobs that used to live in a notebook.
            </h2>
          </div>
          <div className="grid gap-x-10 border-t border-border sm:grid-cols-2">
            {TOOLS.map(tool => (
              <div key={tool.title} className="border-b border-border py-8">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint text-primary">
                  <Icon name={tool.icon} size={20} />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink">{tool.title}</h3>
                <p className="mt-2 leading-relaxed text-gray-ink">{tool.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" aria-labelledby="pricing-title" className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid overflow-hidden rounded-2xl border border-border bg-surface shadow-card md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="border-b border-border p-8 sm:p-10 md:border-b-0 md:border-r">
              <p className="kicker">Pricing</p>
              <h2 id="pricing-title" className="mt-3 font-display text-2xl font-medium text-ink">
                One plan, everything included.
              </h2>
              <p className="mt-8 flex items-baseline gap-2">
                <span className="display-xl text-clay tabular">₱499</span>
                <span className="text-gray-ink">per month</span>
              </p>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-gray-ink">
                Listing is free while you finish onboarding. No long-term contract, and a 30-day
                money-back guarantee on paid plans.
              </p>
              <Link
                to="/auth/signup/landlord"
                className={buttonClasses({ size: 'lg', className: 'mt-8 w-full sm:w-auto' })}
              >
                Create a landlord account
              </Link>
            </div>
            <div className="p-8 sm:p-10">
              <h3 className="text-sm font-semibold text-ink">Included in the plan</h3>
              <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {INCLUDED.map(feature => (
                  <li key={feature} className="flex items-start gap-3 text-[0.9375rem] text-ink">
                    <Icon name="check" size={18} className="mt-0.5 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <p className="mt-8 border-t border-border pt-5 text-sm text-gray-ink">
                Full terms are in the{' '}
                <Link
                  to="/legal/terms-of-service"
                  className="font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                >
                  Terms of Service
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Close */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
          <div className="max-w-xl">
            <h2 className="display-md text-ink">Have a question before you sign up?</h2>
            <p className="mt-3 leading-relaxed text-gray-ink">
              Write to{' '}
              <a
                href="mailto:support@havenspace.app"
                className="font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
              >
                support@havenspace.app
              </a>{' '}
              and someone from the team will get back to you.
            </p>
          </div>
          <Link to="/auth/signup/landlord" className={buttonClasses({ size: 'lg' })}>
            Create a landlord account
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
