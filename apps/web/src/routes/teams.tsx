import { createFileRoute, Link } from '@tanstack/react-router';
import { PublicLayout } from '../components/layout/PublicLayout';

export const Route = createFileRoute('/teams')({
  component: TeamsPage,
});

const MEMBERS = [
  {
    image: '/assets/teams/digal.png',
    name: 'John Paul Digal',
    role: 'Project manager and team lead',
    course: 'BSIT 2B',
    description:
      'Leads the vision, roadmap, and coordination across the team to ship Haven Space end to end.',
  },
  {
    image: '/assets/teams/ybanez.jpeg',
    name: 'Alistair Ybanez',
    role: 'Front-end developer',
    course: 'BSIT 2B',
    description:
      'Builds the interfaces boarders and landlords use every day, from the public site to the dashboards.',
  },
  {
    image: '/assets/teams/abecia.png',
    name: 'John Paul Abecia',
    role: 'Back-end developer',
    course: 'BSIT 2B',
    description:
      'Designs the API, database, and platform services that power listings, applications, and payments.',
  },
  {
    image: '/assets/teams/palmares.png',
    name: 'Melvis Alfonse Palmares',
    role: 'QA, testing and documentation lead',
    course: 'BSIT 2B',
    description:
      'Keeps the platform reliable: testing flows, hunting bugs, and keeping the docs in shape.',
  },
];

function TeamsPage() {
  return (
    <PublicLayout>
      <section className="paper-grain border-b border-border">
        <div className="rise-in mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-16 lg:pt-24">
          <p className="kicker">The team</p>
          <h1 className="display-xl mt-4 max-w-3xl text-ink">The four people behind Haven Space.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-ink">
            We are IT students from BSIT 2B, and each of us owns one part of the platform.{' '}
            <Link
              to="/our-story"
              className="font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            >
              Read how it started
            </Link>
            .
          </p>
        </div>
      </section>

      <section aria-label="Team members" className="bg-cream">
        <ul className="mx-auto grid max-w-7xl gap-x-8 gap-y-14 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8 lg:py-24">
          {MEMBERS.map((member, index) => (
            <li key={member.name} className={index % 2 === 1 ? 'lg:mt-16' : undefined}>
              <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-subtle">
                <img
                  src={member.image}
                  alt={`Portrait of ${member.name}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <h2 className="mt-5 font-display text-xl font-medium tracking-[-0.015em] text-ink">
                {member.name}
              </h2>
              <p className="mt-1 text-sm font-semibold text-primary">
                {member.role}
                <span className="font-normal text-gray-ink"> · {member.course}</span>
              </p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-gray-ink">
                {member.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </PublicLayout>
  );
}
