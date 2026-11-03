import { Link } from '@tanstack/react-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../ui/Icon';
import { PublicLayout } from './PublicLayout';

export interface LegalSection {
  number: string;
  title: string;
  body: ReactNode;
}

const DOCUMENTS = [
  { to: '/legal/privacy-policy', label: 'Privacy Policy' },
  { to: '/legal/terms-of-service', label: 'Terms of Service' },
  { to: '/legal/user-agreement', label: 'User Agreement' },
] as const;

function sectionId(section: LegalSection) {
  return `section-${section.number}`;
}

/**
 * Highlights the section currently being read. Purely a reading aid: the contents list works as
 * plain anchor links without it (and during SSR, before this runs).
 */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const elements = ids
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // A band across the upper part of the viewport, below the sticky topbar.
      { rootMargin: '-96px 0px -60% 0px' }
    );
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [ids.join('|')]);

  return active;
}

function Contents({
  sections,
  active,
  onNavigate,
}: {
  sections: LegalSection[];
  active: string | null;
  onNavigate?: () => void;
}) {
  return (
    <ol className="space-y-0.5 border-l border-border">
      {sections.map(section => {
        const id = sectionId(section);
        const isActive = active === id;
        return (
          <li key={section.number}>
            <a
              href={`#${id}`}
              onClick={onNavigate}
              aria-current={isActive ? 'location' : undefined}
              className={`-ml-px flex gap-2 border-l-2 py-1.5 pl-4 pr-2 text-sm leading-snug transition-colors ${
                isActive
                  ? 'border-primary font-semibold text-ink'
                  : 'border-transparent text-gray-ink hover:border-border-strong hover:text-ink'
              }`}
            >
              <span className="tabular text-muted">{section.number}.</span>
              <span>{section.title}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export function LegalLayout({
  title,
  subtitle,
  updated,
  sections,
}: {
  title: string;
  subtitle: string;
  updated: string;
  sections: LegalSection[];
}) {
  const active = useActiveSection(sections.map(sectionId));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <PublicLayout>
      <header className="paper-grain border-b border-border">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14 lg:px-8">
          <nav aria-label="Legal documents" className="-mx-1 overflow-x-auto">
            <ul className="flex gap-1 px-1">
              {DOCUMENTS.map(doc => (
                <li key={doc.to}>
                  <Link
                    to={doc.to}
                    className="inline-flex h-9 items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium text-gray-ink transition-colors hover:bg-subtle hover:text-ink"
                    activeProps={{
                      className: 'bg-surface !text-ink shadow-card',
                      'aria-current': 'page',
                    }}
                  >
                    {doc.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="rise-in mt-8 max-w-3xl">
            <h1 className="display-lg text-ink">{title}</h1>
            <p className="mt-4 text-lg leading-relaxed text-gray-ink">{subtitle}</p>
            <p className="mt-4 text-sm text-gray-ink">
              Last updated <span className="font-semibold text-ink">{updated}</span>
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:py-14">
        {/* Contents: collapsible on small screens, sticky alongside the text on wide ones. */}
        <div className="mb-8 rounded-2xl border border-border bg-surface lg:hidden">
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="legal-contents-mobile"
            onClick={() => setMobileOpen(open => !open)}
            className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold text-ink"
          >
            On this page
            <Icon
              name="chevronDown"
              size={18}
              className={`text-gray-ink transition-transform duration-200 motion-reduce:transition-none ${
                mobileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {mobileOpen ? (
            <div id="legal-contents-mobile" className="px-4 pb-4">
              <Contents
                sections={sections}
                active={active}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          ) : null}
        </div>

        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-3 text-sm font-semibold text-ink">On this page</p>
            <Contents sections={sections} active={active} />
          </div>
        </nav>

        <article className="prose-haven">
          {sections.map((section, index) => (
            <section
              key={section.number}
              id={sectionId(section)}
              aria-labelledby={`${sectionId(section)}-title`}
              className="scroll-mt-24"
            >
              {/* `prose-haven` is unlayered CSS, so a utility can't zero the first heading's
                  top margin; an inline style lines it up with the contents list. */}
              <h2
                id={`${sectionId(section)}-title`}
                style={index === 0 ? { marginTop: 0 } : undefined}
              >
                <span className="mr-2 text-primary tabular">{section.number}.</span>
                {section.title}
              </h2>
              {section.body}
            </section>
          ))}
          <p className="mt-12 border-t border-border pt-6 text-sm">
            Questions about this document? Write to{' '}
            <a href="mailto:support@havenspace.app">support@havenspace.app</a>.
          </p>
        </article>
      </div>
    </PublicLayout>
  );
}
