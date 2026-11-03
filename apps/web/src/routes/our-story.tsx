import { createFileRoute, Link } from '@tanstack/react-router';
import { PublicLayout } from '../components/layout/PublicLayout';
import { Testimonials } from '../components/home/Testimonials';

export const Route = createFileRoute('/our-story')({
  component: OurStoryPage,
});

const TIMELINE = [
  {
    year: '2023',
    title: 'Founding & Launch',
    description:
      'Haven Space launched with 50 verified properties and a mission to create trust in student housing. Our unique verification system set us apart from day one.',
    image: '/assets/images/lanlod_portrait_with_interviewer.jpg',
    flip: false,
  },
  {
    year: '2024',
    title: 'Expansion & Innovation',
    description:
      'We expanded to 3 major cities, introduced our AI matching system, and launched the mobile app. Our community grew to 5,000+ active users.',
    image: '/assets/images/boarder_interview.jpg',
    flip: true,
  },
  {
    year: '2025',
    title: 'Community & Trust',
    description:
      'Focused on building community features, we introduced landlord-boarder forums, virtual tours, and our 5-star safety rating system that became an industry standard.',
    image: '/assets/images/public/jasmine.jpg',
    flip: true,
  },
  {
    year: '2026',
    title: 'The Future',
    description:
      "With the launch of Haven AI, we're pioneering intelligent housing solutions. Our goal: 100,000 happy boarders by 2027 and expansion across Southeast Asia.",
    image: null,
    flip: false,
  },
];

const VALUES = [
  {
    icon: 'home',
    title: 'Safe Havens',
    description:
      'Every property on our platform undergoes rigorous verification. Your safety and comfort are our top priorities.',
  },
  {
    icon: 'users',
    title: 'Community First',
    description:
      'We believe in building connections that last beyond the tenancy. Our platform fosters real community between boarders and landlords.',
  },
  {
    icon: 'lightbulb',
    title: 'Innovation',
    description:
      'From AI matching to virtual tours, we are constantly pushing boundaries to make finding and managing housing better.',
  },
  {
    icon: 'shieldCheck',
    title: 'Integrity',
    description:
      'Transparent pricing, honest reviews, and fair policies. We build trust through consistency and ethical practices.',
  },
];

const IMPACT = [
  { value: '10,000+', label: 'Happy Boarders' },
  { value: '2,500+', label: 'Verified Properties' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '50+', label: 'Cities Served' },
];

function SectionBadge({ children }: { children: string }) {
  return (
    <span className="inline-block rounded-full bg-mint px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
      {children}
    </span>
  );
}

function OurStoryPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-cream">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-mint/40 blur-3xl" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-10 px-4 py-16 md:flex-row md:py-24">
          <div className="max-w-xl">
            <SectionBadge>Our Story</SectionBadge>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-ink md:text-5xl">
              Building Trust, One Home at a Time
            </h1>
            <p className="mt-4 text-lg text-gray-ink">
              From a simple idea to a trusted platform, discover how Haven Space is transforming the
              boarding house experience through technology and community.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/auth/choose"
                className="rounded-full bg-primary-strong px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Join Our Community
              </Link>
              <a
                href="#timeline"
                className="rounded-full border-2 border-primary px-6 py-3 text-sm font-semibold text-primary hover:bg-mint"
              >
                Explore Our Journey
              </a>
            </div>
          </div>
          <img
            src="/assets/images/public/story_hero.png"
            alt="Haven Space journey illustration"
            className="w-full max-w-md"
          />
        </div>
      </section>

      {/* Beginnings */}
      <section className="bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-4 py-16 md:flex-row md:py-20">
          <div className="max-w-xl">
            <SectionBadge>2023</SectionBadge>
            <h2 className="mt-3 text-3xl font-bold text-ink">Our Beginnings</h2>
            <p className="mt-3 text-gray-ink">
              Haven Space was born from a personal struggle — our founder&apos;s frustrating
              experience finding safe, quality boarding houses. What started as a simple solution
              for friends quickly grew into a mission to revolutionize student housing.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-cream p-4 text-center">
                <div className="text-2xl font-bold text-primary">1</div>
                <div className="mt-1 text-sm text-gray-ink">Founder&apos;s Vision</div>
              </div>
              <div className="rounded-xl border border-border bg-cream p-4 text-center">
                <div className="text-2xl font-bold text-primary">50+</div>
                <div className="mt-1 text-sm text-gray-ink">Early Adopters</div>
              </div>
              <div className="rounded-xl border border-border bg-cream p-4 text-center">
                <div className="text-2xl font-bold text-primary">100%</div>
                <div className="mt-1 text-sm text-gray-ink">Organic Growth</div>
              </div>
            </div>
          </div>
          <img
            src="/assets/images/landlord_interview.jpg"
            alt="Founder interview about Haven Space beginnings"
            className="w-full max-w-md rounded-2xl object-cover shadow-card"
          />
        </div>
      </section>

      {/* Timeline */}
      <section id="timeline" className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="mb-12 text-center">
            <SectionBadge>Journey</SectionBadge>
            <h2 className="mt-3 text-3xl font-bold text-ink">Our Growth Timeline</h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-ink">
              From humble beginnings to becoming a trusted name in student housing, every milestone
              reflects our commitment to quality and community.
            </p>
          </div>
          <div className="space-y-12">
            {TIMELINE.map(item => (
              <div
                key={item.year}
                className={`flex flex-col items-center gap-6 md:flex-row ${
                  item.flip ? 'md:flex-row-reverse' : ''
                }`}
              >
                <div className="w-24 shrink-0 text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-strong text-lg font-bold text-white">
                    {item.year}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-ink">{item.title}</h3>
                  <p className="mt-2 text-gray-ink">{item.description}</p>
                </div>
                {item.image ? (
                  <img
                    src={item.image}
                    alt={`${item.year} ${item.title}`}
                    className="w-full max-w-sm rounded-2xl object-cover shadow-card"
                  />
                ) : (
                  <div className="flex w-full max-w-sm items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-mint/30 p-8 text-center">
                    <p className="text-sm font-medium text-primary">
                      The next chapter is being written…
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="mb-12 text-center">
            <SectionBadge>Core Values</SectionBadge>
            <h2 className="mt-3 text-3xl font-bold text-ink">What Drives Us</h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-ink">
              Our values aren&apos;t just words on a wall — they guide every decision, every
              feature, and every interaction.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(value => (
              <div
                key={value.title}
                className="rounded-xl border border-border bg-cream p-6 text-center shadow-card"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mint">
                  <img
                    src={`/assets/svg/${
                      value.icon === 'shieldCheck'
                        ? 'verified.svg'
                        : value.icon === 'home'
                        ? 'dashboard.svg'
                        : value.icon === 'users'
                        ? 'users.svg'
                        : 'lightbulb.svg'
                    }`}
                    alt=""
                    width={24}
                    height={24}
                  />
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">{value.title}</h3>
                <p className="mt-2 text-sm text-gray-ink">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact */}
      <section className="bg-primary-hover">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-mint">
            Our Impact
          </span>
          <h2 className="mt-3 text-3xl font-bold text-white">By The Numbers</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/70">
            Our journey in numbers — each statistic represents a life improved and a community
            strengthened.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {IMPACT.map(stat => (
              <div key={stat.label} className="rounded-xl bg-white/5 p-6">
                <div className="text-3xl font-bold text-mint">{stat.value}</div>
                <div className="mt-1 text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* Join */}
      <section className="bg-cream">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-4 py-16 md:flex-row">
          <div className="max-w-xl">
            <SectionBadge>Be Part of Our Story</SectionBadge>
            <h2 className="mt-3 text-3xl font-bold text-ink">Join the Haven Space Community</h2>
            <p className="mt-3 text-gray-ink">
              Whether you&apos;re looking for your perfect boarding house or want to list your
              property, become part of our growing community today.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/auth/choose"
                className="rounded-full bg-primary-strong px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Find Your Haven
              </Link>
              <Link
                to="/auth/signup/landlord"
                className="rounded-full border-2 border-primary px-6 py-3 text-sm font-semibold text-primary hover:bg-mint"
              >
                List Your Property
              </Link>
            </div>
          </div>
          <img
            src="/assets/images/public/find_illustratin.png"
            alt="Join our community"
            className="w-full max-w-md"
          />
        </div>
      </section>
    </PublicLayout>
  );
}
