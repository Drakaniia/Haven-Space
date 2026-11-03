import { createFileRoute, Link } from '@tanstack/react-router';
import { PublicLayout } from '../components/layout/PublicLayout';

export const Route = createFileRoute('/for-landlords')({
  component: ForLandlordsPage,
});

const BENEFITS = [
  {
    icon: '/assets/images/icons/verified_boarder.png',
    title: 'Verified Boarders',
    description:
      'Connect with pre-screened tenants who have verified identities and rental histories.',
  },
  {
    icon: '/assets/images/icons/analytics_dashboard.png',
    title: 'Analytics Dashboard',
    description: 'Track views, applications, and occupancy rates with real-time insights.',
  },
  {
    icon: '/assets/images/icons/payment_tracking.png',
    title: 'Payment Tracking',
    description:
      'Monitor rent payments, track payment history, and manage multiple payment methods.',
  },
  {
    icon: '/assets/images/icons/isntant_notification.png',
    title: 'Instant Notifications',
    description: 'Get notified immediately when someone applies or messages about your property.',
  },
  {
    icon: '/assets/images/icons/secure_platform.png',
    title: 'Secure Platform',
    description: 'Your data and transactions are protected with industry-standard encryption.',
  },
];

const FEATURES = [
  'Unlimited property listings',
  'Unlimited tenant applications',
  'Advanced analytics dashboard',
  'Priority customer support',
  'Featured property listings',
  'Automated payment tracking',
  'Maintenance request management',
  'Instant application notifications',
];

function ForLandlordsPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-cream">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-mint/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center md:py-24">
          <span className="inline-block rounded-full bg-mint px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            For Landlords
          </span>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-tight text-ink md:text-5xl">
            List your property.
            <br />
            Reach verified boarders.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-ink">
            Haven Space connects property owners with quality tenants. Manage listings, track
            applications, and grow your rental business with our trusted platform.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth/signup/landlord"
              className="rounded-full bg-primary-strong px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Get Started
            </Link>
            <a
              href="#pricing"
              className="rounded-full border-2 border-primary px-6 py-3 text-sm font-semibold text-primary hover:bg-mint"
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full bg-mint px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
              Why Choose Us
            </span>
            <h2 className="mt-3 text-3xl font-bold text-ink">
              Everything you need to run your property
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-ink">
              Powerful tools that make managing boarders and listings simple, so you can focus on
              growing your business.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(benefit => (
              <div
                key={benefit.title}
                className="rounded-xl border border-border bg-cream p-6 text-center shadow-card"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint">
                  <img
                    src={benefit.icon}
                    alt=""
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">{benefit.title}</h3>
                <p className="mt-2 text-sm text-gray-ink">{benefit.description}</p>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-mint/20 p-6 text-center">
              <h3 className="text-lg font-bold text-primary">Ready to start?</h3>
              <p className="mt-2 text-sm text-gray-ink">
                Create your landlord account and list your first property today.
              </p>
              <Link
                to="/auth/signup/landlord"
                className="mt-4 rounded-full bg-primary-strong px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full bg-mint px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
              Pricing
            </span>
            <h2 className="mt-3 text-3xl font-bold text-ink">Simple, transparent pricing</h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-ink">
              Everything you need to manage your properties, all in one plan.
            </p>
          </div>
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-primary-hover shadow-pop">
            <div className="p-8 md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-mint">Pro Plan</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <h3 className="text-4xl font-bold text-white">₱499</h3>
                    <span className="text-white/60">/ month</span>
                  </div>
                  <p className="mt-2 text-white/70">Complete property management solution</p>
                </div>
              </div>
              <p className="mt-6 text-xs font-bold uppercase tracking-widest text-white/50">
                All features included:
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {FEATURES.map(feature => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/90">
                    <img
                      src="/assets/svg/check.svg"
                      alt=""
                      width={16}
                      height={16}
                      className="shrink-0"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth/signup/landlord"
                className="mt-8 inline-block rounded-full bg-mint px-8 py-3 text-sm font-bold text-primary-dark hover:bg-surface"
              >
                Get Started Now
              </Link>
              <p className="mt-3 text-xs text-white/50">
                30-day money-back guarantee. No long-term contracts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-ink">
            Ready to <span className="text-primary">grow</span> your rental business?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-ink">
            Join hundreds of landlords who trust Haven Space to manage their properties and connect
            with quality tenants.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth/signup/landlord"
              className="inline-flex items-center gap-2 rounded-full bg-primary-strong px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Start Listing Today
              <img src="/assets/svg/chevron-right.svg" alt="" width={18} height={18} />
            </Link>
            <Link
              to="/"
              className="rounded-full border-2 border-border-strong px-6 py-3 text-sm font-semibold text-gray-ink hover:bg-subtle"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
