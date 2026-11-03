import { Link } from '@tanstack/react-router';

const COLUMNS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Company',
    links: [
      { to: '/our-story', label: 'Our Story' },
      { to: '/teams', label: 'Our Team' },
      { to: '/for-landlords', label: 'For Landlords' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/legal/privacy-policy', label: 'Privacy Policy' },
      { to: '/legal/terms-of-service', label: 'Terms of Service' },
      { to: '/legal/user-agreement', label: 'User Agreement' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { to: '/find-a-room', label: 'Find a Room' },
      { to: '/maps', label: 'Maps' },
      { to: '/haven-ai', label: 'Haven AI' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div>
          <img
            src="/assets/images/Haven_Space_Logo.png"
            alt="Haven Space"
            className="h-10 w-10 object-contain"
          />
          <p className="mt-3 text-sm text-gray-ink">
            Affordable boarding houses and rooms across the Philippines.
          </p>
        </div>
        {COLUMNS.map(column => (
          <div key={column.title}>
            <p className="mb-3 text-sm font-semibold">{column.title}</p>
            <ul className="space-y-2">
              {column.links.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-gray-ink hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-4 text-center text-sm text-gray-ink">
        © {new Date().getFullYear()} Haven Space. All rights reserved.
      </div>
    </footer>
  );
}
