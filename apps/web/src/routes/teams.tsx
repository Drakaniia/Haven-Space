import { createFileRoute } from '@tanstack/react-router';
import { PublicLayout } from '../components/layout/PublicLayout';

export const Route = createFileRoute('/teams')({
  component: TeamsPage,
});

const MEMBERS = [
  {
    image: '/assets/teams/digal.png',
    name: 'John Paul Digal',
    role: 'Project Manager / Team Leader',
    course: 'BSIT 2B',
    description:
      'Leads the vision, roadmap, and coordination across the team to ship Haven Space end to end.',
  },
  {
    image: '/assets/teams/ybanez.jpeg',
    name: 'Alistair Ybanez',
    role: 'Front-End Developer',
    course: 'BSIT 2B',
    description:
      'Builds the interfaces boarders and landlords use every day, from the public site to the dashboards.',
  },
  {
    image: '/assets/teams/abecia.png',
    name: 'John Paul Abecia',
    role: 'Back-End Developer',
    course: 'BSIT 2B',
    description:
      'Designs the API, database, and platform services that power listings, applications, and payments.',
  },
  {
    image: '/assets/teams/palmares.png',
    name: 'Melvis Alfonse Palmares',
    role: 'QA / Tester / Documentation Lead',
    course: 'BSIT 2B',
    description:
      'Keeps the platform reliable — testing flows, hunting bugs, and keeping the docs in shape.',
  },
];

function TeamsPage() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-cream">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-mint/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center md:py-24">
          <span className="inline-block rounded-full bg-mint px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            Our Team
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-bold text-ink md:text-5xl">
            The people behind Haven Space
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-ink">
            A small team of builders focused on making renting feel like home.
          </p>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {MEMBERS.map(member => (
              <div
                key={member.name}
                className="overflow-hidden rounded-2xl border border-border bg-cream shadow-card"
              >
                <div className="aspect-square overflow-hidden bg-mint/30">
                  <img
                    src={member.image}
                    alt={member.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-bold uppercase text-ink">{member.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-primary">{member.role}</p>
                  <p className="text-xs text-gray-ink">{member.course}</p>
                  <p className="mt-3 text-sm text-gray-ink">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
