import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { PublicNavbar } from './PublicNavbar';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <PublicNavbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
