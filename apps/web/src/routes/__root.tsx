import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Link,
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  useNavigate,
} from '@tanstack/react-router';
import { useEffect, useState, type ReactNode } from 'react';
import { AuthProvider } from '../lib/auth-context';
import {
  handleGooglePendingHash,
  handleOAuthHash,
  redirectPathForUser,
  sanitizeRedirect,
} from '../lib/oauth';
import { ToastHost } from '../components/ui/Toast';
import { setPendingToast } from '../lib/toast';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      // Always light mode — never follow the device's dark-mode preference.
      { name: 'color-scheme', content: 'light' },
      { name: 'theme-color', content: '#f6f2e9' },
      { title: 'Haven Space' },
    ],
    links: [
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,400..700,0..100,0..1;1,9..144,400..700,0..100,0..1&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function NotFoundPage() {
  return (
    <main className="paper-grain flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="rise-in flex max-w-md flex-col items-center">
        <Link to="/" className="mb-10 flex items-center gap-2">
          <img src="/assets/images/Haven_Space_Logo.png" alt="" className="h-8 w-8 object-contain" />
          <span className="font-display text-lg font-semibold text-ink">Haven Space</span>
        </Link>
        <p className="display-xl text-primary">404</p>
        <h1 className="display-md mt-4 text-ink">This door doesn&apos;t open.</h1>
        <p className="mt-3 text-base leading-relaxed text-gray-ink">
          The page you&apos;re looking for doesn&apos;t exist or has moved. Let&apos;s get you
          back somewhere familiar.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center rounded-xl bg-primary-strong px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover active:scale-[0.97]"
          >
            Back to home
          </Link>
          <Link
            to="/find-a-room"
            className="inline-flex items-center rounded-xl border border-border-strong bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-subtle active:scale-[0.97]"
          >
            Browse rooms
          </Link>
        </div>
      </div>
    </main>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());
  const navigate = useNavigate();

  // Handle the Google OAuth `#auth=` callback hash on any page, and route
  // `#google-pending=` sessions to the role chooser. When the callback carries
  // a `?redirect=` (set by the API from the OAuth state), return the user there
  // instead of the default role home — e.g. back to /haven-ai. If the user is
  // already on that page, stay put so the page can pick up pending state.
  useEffect(() => {
    const user = handleOAuthHash();
    if (user) {
      setPendingToast('success', `Welcome back, ${user.first_name}!`);
      const redirect = sanitizeRedirect(
        typeof window === 'undefined'
          ? null
          : new URLSearchParams(window.location.search).get('redirect')
      );
      const target = redirect ?? redirectPathForUser(user);
      if (window.location.pathname !== target) {
        void navigate({ to: target });
      }
      return;
    }
    const pending = handleGooglePendingHash();
    if (pending) {
      // Already on the chooser — let its own effect parse the hash. Don't
      // navigate and strip the fragment, or the JWT is lost ("session expired").
      if (window.location.pathname === '/auth/choose-role') return;
      const rawHash = window.location.hash.slice(1);
      // Preserve the pending JWT through the navigation; TanStack hash support
      // varies by version, so double-ensure window.location.hash survives.
      void navigate({ to: '/auth/choose-role', hash: rawHash } as never);
      // Fallback: if router drops hash, restore it synchronously
      if (rawHash && window.location.hash.slice(1) !== rawHash) {
        window.location.hash = rawHash;
      }
    }
  }, [navigate]);

  return (
    <RootDocument>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
      </AuthProvider>
      <ToastHost />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="bg-cream text-ink antialiased">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
