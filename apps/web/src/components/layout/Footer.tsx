import { Link } from '@tanstack/react-router';

/** Grouped by what someone is trying to do, not by template column names. */
const GROUPS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Looking for a room',
    links: [
      { to: '/find-a-room', label: 'Browse rooms' },
      { to: '/maps', label: 'Map view' },
      { to: '/haven-ai', label: 'Ask Haven AI' },
    ],
  },
  {
    title: 'Renting out rooms',
    links: [
      { to: '/for-landlords', label: 'Why list with Haven' },
      { to: '/auth/signup/landlord', label: 'Create a landlord account' },
    ],
  },
  {
    title: 'About',
    links: [
      { to: '/our-story', label: 'Our story' },
      { to: '/teams', label: 'The team' },
    ],
  },
];

const LEGAL = [
  { to: '/legal/privacy-policy', label: 'Privacy' },
  { to: '/legal/terms-of-service', label: 'Terms' },
  { to: '/legal/user-agreement', label: 'User agreement' },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_2fr] lg:px-8">
        <div className="max-w-sm">
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Haven Space home">
            <img
              src="/assets/images/Haven_Space_Logo.png"
              alt=""
              className="h-9 w-9 object-contain"
            />
            <span className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">
              Haven Space
            </span>
          </Link>
          <p className="mt-4 font-display text-[1.375rem] leading-snug tracking-[-0.01em] text-ink">
            Affordable, verified boarding houses across the Philippines.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-ink">
            Built for students and young professionals looking for a room near school or work, and
            for the landlords who keep those houses running.
          </p>
        </div>
        <div className="grid gap-10 sm:grid-cols-3">
          {GROUPS.map(group => (
            <div key={group.title}>
              <p className="text-sm font-semibold text-ink">{group.title}</p>
              <ul className="mt-4 space-y-2.5">
                {group.links.map(link => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-gray-ink transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-gray-ink sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Haven Space</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL.map(link => (
              <li key={link.to}>
                <Link to={link.to} className="transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
