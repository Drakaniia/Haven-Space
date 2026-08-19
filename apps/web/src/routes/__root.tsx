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
        href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="text-2xl font-bold text-ink">Page not found</h1>
      <p className="max-w-md text-sm text-gray-ink">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
      >
        ← Back to home
      </Link>
    </div>
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
    if (handleGooglePendingHash()) void navigate({ to: '/auth/choose-role' });
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
    <html lang="en" className="bg-cream text-ink">
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
