import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export const Route = createFileRoute('/pitch')({
  head: () => ({ meta: [{ title: 'Haven Space — Pitch' }] }),
  component: PitchPage,
});

const SLIDE_MS = 10_000; // 9 slides × 10s ≈ 90s on autoplay

// Estimates in PHP for year one; edit before presenting.
const BUDGET = [
  { item: 'Cloudflare Workers Paid plan (API + D1 database)', note: 'US$5/mo × 12', php: 3500 },
  { item: 'Domain name (havenspace.ph or .com)', note: '1 year', php: 1000 },
  { item: 'Cloudflare Pages hosting', note: 'Free tier', php: 0 },
  { item: 'UploadThing photo storage', note: 'Free tier (2 GB)', php: 0 },
  { item: 'Contingency (FX swings, overage)', note: 'Buffer', php: 500 },
];
const TOTAL = BUDGET.reduce((sum, b) => sum + b.php, 0);
const peso = (n: number) => `₱${n.toLocaleString('en-PH')}`;

/** Staggered entrance; `i` is the order on the slide. */
const In = ({ i = 0, children, className = '' }: { i?: number; children: ReactNode; className?: string }) => (
  <div className={`pitch-in ${className}`} style={{ animationDelay: `${150 + i * 140}ms` } as CSSProperties}>
    {children}
  </div>
);

const Kicker = ({ children }: { children: ReactNode }) => (
  <In>
    <p className="mb-4 text-xs font-bold tracking-[0.3em] text-primary-light uppercase sm:text-sm">{children}</p>
  </In>
);

const Title = ({ i = 1, children }: { i?: number; children: ReactNode }) => (
  <In i={i}>
    <h2 className="font-display text-4xl leading-[1.05] font-semibold text-cream sm:text-6xl">{children}</h2>
  </In>
);

const Card = ({ i, title, children }: { i: number; title: string; children: ReactNode }) => (
  <In i={i}>
    <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <h3 className="font-display text-xl font-semibold text-cream">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-cream/70">{children}</p>
    </div>
  </In>
);

const Stat = ({ i, value, label }: { i: number; value: string; label: string }) => (
  <In i={i}>
    <p className="font-display text-4xl font-semibold text-primary-light sm:text-5xl">{value}</p>
    <p className="mt-1 text-sm text-cream/70">{label}</p>
  </In>
);

const SLIDES: { name: string; bg?: string; body: ReactNode }[] = [
  {
    name: 'Title',
    bg: '/assets/images/boarder_interview.jpg',
    body: (
      <div className="text-center">
        <In>
          <img src="/assets/images/Haven_Space_Logo.png" alt="" className="mx-auto mb-6 h-20 w-20 rounded-2xl" />
        </In>
        <In i={1}>
          <h1 className="font-display text-6xl font-semibold text-cream sm:text-8xl">Haven Space</h1>
        </In>
        <In i={2}>
          <p className="mt-5 font-display text-2xl text-cream/80 italic sm:text-3xl">
            Find your home away from home.
          </p>
        </In>
        <In i={3}>
          <p className="mt-8 text-sm tracking-[0.3em] text-primary-light uppercase">
            The boarding house platform for Bukidnon
          </p>
        </In>
      </div>
    ),
  },
  {
    name: 'Problem',
    body: (
      <>
        <Kicker>The problem</Kicker>
        <Title>Finding a boarding house still means walking door to door.</Title>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Card i={2} title="Students guess">
            Listings live in Facebook posts and word of mouth. No photos, prices, or rules up front.
          </Card>
          <Card i={3} title="Landlords chase">
            Rent is tracked in notebooks. Vacancies sit empty while tenants can’t find them.
          </Card>
          <Card i={4} title="Parents worry">
            No way to check if a place is safe, verified, or close to campus before move-in.
          </Card>
        </div>
      </>
    ),
  },
  {
    name: 'Solution',
    bg: '/assets/images/landlord_interview.jpg',
    body: (
      <>
        <Kicker>The solution</Kicker>
        <Title>One place where boarders and landlords meet.</Title>
        <In i={2}>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/80">
            Haven Space lists verified rooms on a map, handles applications and bookings, and gives landlords a
            dashboard for payments, boarders, and announcements.
          </p>
        </In>
        <In i={3}>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex rounded-xl bg-primary-strong px-6 py-3 font-semibold text-white hover:bg-primary-hover"
          >
            It’s live → haven-space.pages.dev
          </a>
        </In>
      </>
    ),
  },
  {
    name: 'Product',
    body: (
      <>
        <Kicker>What you get</Kicker>
        <Title>Built, working, and ready today.</Title>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card i={2} title="Map search">
            Browse rooms near CMU, BukSU, and Valencia by price, amenities, and distance.
          </Card>
          <Card i={3} title="Apply & book">
            Apply online, chat with the landlord, confirm the booking. No more door knocking.
          </Card>
          <Card i={4} title="Landlord dashboard">
            Listings, boarders, payments, maintenance, and renewals in one place.
          </Card>
          <Card i={5} title="Verified & safe">
            Landlord verification and admin review so parents know who runs the house.
          </Card>
        </div>
      </>
    ),
  },
  {
    name: 'Market',
    body: (
      <>
        <Kicker>Target market</Kicker>
        <Title>College students in Bukidnon — and the landlords who house them.</Title>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <Stat i={2} value="40,000+" label="College students in Bukidnon (est.) — CMU, BukSU, Valencia colleges" />
          <Stat i={3} value="~60%" label="Live away from home and need a room near campus (est.)" />
          <Stat i={4} value="500+" label="Boarding houses around Musuan, Malaybalay, Valencia (est.)" />
        </div>
        <In i={5}>
          <p className="mt-10 max-w-2xl text-cream/70">
            Start where we live and study. Win one province, then copy the playbook to every university town in
            Mindanao.
          </p>
        </In>
      </>
    ),
  },
  {
    name: 'Model',
    body: (
      <>
        <Kicker>How it grows</Kicker>
        <Title>Free to start. Built to earn.</Title>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Card i={2} title="Free for boarders">
            Students never pay to search or apply. That brings the demand landlords want.
          </Card>
          <Card i={3} title="Landlord plans">
            Premium listings and dashboard tools for landlords. Pricing set after launch feedback.
          </Card>
          <Card i={4} title="Near-zero cost">
            Serverless on Cloudflare: costs stay flat until thousands of users.
          </Card>
        </div>
      </>
    ),
  },
  {
    name: 'Costs',
    body: (
      <>
        <Kicker>Capital & initial operating expenses</Kicker>
        <Title>Year one runs on less than a month’s rent.</Title>
        <In i={2}>
          <table className="mt-8 w-full max-w-3xl text-left text-sm sm:text-base">
            <tbody>
              {BUDGET.map((b) => (
                <tr key={b.item} className="border-b border-white/10">
                  <td className="py-3 pr-4 text-cream">{b.item}</td>
                  <td className="py-3 pr-4 text-cream/60">{b.note}</td>
                  <td className="py-3 text-right font-semibold text-cream tabular-nums">{peso(b.php)}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-4 font-display text-xl font-semibold text-primary-light" colSpan={2}>
                  Total, year one
                </td>
                <td className="pt-4 text-right font-display text-xl font-semibold text-primary-light tabular-nums">
                  {peso(TOTAL)}
                </td>
              </tr>
            </tbody>
          </table>
        </In>
        <In i={3}>
          <p className="mt-6 text-sm text-cream/60">
            Development is done by the student team. Estimates at ~₱58 per US$; prices may vary.
          </p>
        </In>
      </>
    ),
  },
  {
    name: 'Ask',
    body: (
      <div className="text-center">
        <Kicker>The ask</Kicker>
        <In i={1}>
          <p className="pitch-glow font-display text-8xl font-semibold text-cream sm:text-[10rem]">{peso(TOTAL)}</p>
        </In>
        <In i={2}>
          <p className="mx-auto mt-6 max-w-xl text-lg text-cream/80">
            Keeps Haven Space online for a full year: cloud hosting, database, and our own domain.
          </p>
        </In>
        <In i={3}>
          <p className="mt-4 text-sm tracking-[0.3em] text-primary-light uppercase">
            Every peso goes to keeping the platform live
          </p>
        </In>
      </div>
    ),
  },
  {
    name: 'Close',
    bg: '/assets/images/boarder_interview.jpg',
    body: (
      <div className="text-center">
        <In>
          <h2 className="font-display text-5xl font-semibold text-cream sm:text-7xl">
            Every student deserves
            <br />a safe place to stay.
          </h2>
        </In>
        <In i={2}>
          <p className="mt-8 font-display text-2xl text-primary-light italic">Help us keep the lights on.</p>
        </In>
        <In i={3}>
          <p className="mt-10 text-sm tracking-[0.3em] text-cream/60 uppercase">Haven Space · haven-space.pages.dev</p>
        </In>
      </div>
    ),
  },
];

const CSS = `
@keyframes pitch-in { from { opacity: 0; transform: translateY(28px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes pitch-kb { from { transform: scale(1.05); } to { transform: scale(1.18) translate(-2%, -1%); } }
@keyframes pitch-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes pitch-glow { 0%,100% { text-shadow: 0 0 40px rgb(141 180 111 / 0.25); } 50% { text-shadow: 0 0 90px rgb(141 180 111 / 0.6); } }
.pitch-in { opacity: 0; animation: pitch-in 900ms cubic-bezier(0.16,1,0.3,1) both; }
.pitch-kb { animation: pitch-kb 14s ease-out both; }
.pitch-glow { animation: pitch-glow 3s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .pitch-in, .pitch-kb, .pitch-glow { animation: none; opacity: 1; } }
`;

function PitchPage() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = SLIDES.length - 1;
  const go = useCallback((d: number) => setIndex((i) => Math.min(last, Math.max(0, i + d))), [last]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) go(1);
      else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) go(-1);
      else if (e.key === 'Home') setIndex(0);
      else if (e.key === 'End') setIndex(last);
      else if (e.key.toLowerCase() === 'p') setPlaying((p) => !p);
      else if (e.key.toLowerCase() === 'f') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, last]);

  useEffect(() => {
    if (!playing) return;
    if (index === last) return setPlaying(false);
    const t = setTimeout(() => go(1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [playing, index, last, go]);

  const slide = SLIDES[index];

  return (
    <main className="fixed inset-0 overflow-hidden bg-primary-dark font-sans text-cream select-none">
      <style>{CSS}</style>

      {/* Remount per slide so entrances replay. */}
      <div key={index} className="absolute inset-0" onClick={() => go(1)}>
        {slide.bg ? (
          <>
            <img src={slide.bg} alt="" className="pitch-kb absolute inset-0 h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-dark via-primary-dark/70 to-primary-dark/30" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgb(59_106_42/0.55),transparent_60%)]" />
        )}
        <section
          aria-live="polite"
          aria-label={`Slide ${index + 1} of ${SLIDES.length}: ${slide.name}`}
          className="relative mx-auto flex h-full max-w-6xl flex-col justify-center overflow-y-auto px-4 py-20 sm:px-12"
        >
          {slide.body}
        </section>
      </div>

      {/* Letterbox bars for the film look. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[5vh] bg-black/60" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[5vh] bg-black/60" />

      <div className="absolute inset-x-0 top-0 flex gap-1 px-4 pt-3">
        {SLIDES.map((s, i) => (
          <button
            key={s.name}
            type="button"
            aria-label={`Go to slide ${i + 1}: ${s.name}`}
            onClick={() => setIndex(i)}
            className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"
          >
            <span
              key={`${index}-${playing}`}
              className="block h-full origin-left bg-primary-light"
              style={
                i < index
                  ? undefined
                  : i === index && playing
                    ? { animation: `pitch-bar ${SLIDE_MS}ms linear both` }
                    : { transform: i === index ? 'scaleX(0.15)' : 'scaleX(0)' }
              }
            />
          </button>
        ))}
      </div>

      <nav className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 pb-2 text-xs text-cream/60">
        <span className="tabular-nums">
          {index + 1} / {SLIDES.length}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={() => go(-1)} className="rounded-lg px-3 py-1 hover:bg-white/10" aria-label="Previous slide">
            ←
          </button>
          <button type="button" onClick={() => setPlaying((p) => !p)} className="rounded-lg px-3 py-1 hover:bg-white/10">
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={() => go(1)} className="rounded-lg px-3 py-1 hover:bg-white/10" aria-label="Next slide">
            →
          </button>
        </div>
        <span className="hidden sm:inline">← → navigate · P play · F fullscreen</span>
      </nav>
    </main>
  );
}
