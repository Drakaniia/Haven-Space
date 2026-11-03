import { afterEach, beforeEach, test, expect } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { AuthProvider } from '../src/lib/auth-context';
import { clearStoredAuth, setStoredAuth } from '../src/lib/auth-store';
import { FeatureGate, RequireTenancy } from '../src/components/boarder/FeatureGate';
import type { AuthUser } from '../src/lib/types';

// Auto-cleanup isn't registered in this environment; unmount between tests so
// queries never see elements from a previous render.
afterEach(() => cleanup());

// FeatureGate renders a TanStack <Link>, which needs a router context. A
// minimal tree keeps this test from importing the app's full routeTree (some
// routes pull in cloudflare:workers, which bun can't resolve), and
// RouterProvider takes no children — it renders the matched root route, so the
// UI under test is swapped in through this slot before each render.
let uiSlot: ReactNode = null;

const rootRoute = createRootRoute({ component: () => uiSlot });
const applicationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/boarder/applications',
});
const router = createRouter({
  routeTree: rootRoute.addChildren([applicationsRoute]),
  history: createMemoryHistory({ initialEntries: ['/boarder/applications'] }),
});

function sessionUser(boarderStatus?: string): AuthUser {
  return {
    id: 1,
    user_id: 1,
    first_name: 'QA',
    last_name: 'Boarder',
    email: 'qa.boarder@example.com',
    role: 'boarder',
    is_verified: true,
    email_verified: true,
    account_status: 'active',
    avatar_url: null,
    phone_number: null,
    verification_status: null,
    boarder_status: boarderStatus,
  };
}

/** Minimal harness mirroring the app shell: AuthProvider + Query + Router. */
function renderGate(status: string | undefined) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  uiSlot = (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RequireTenancy>
          <p>tenancy content</p>
        </RequireTenancy>
      </QueryClientProvider>
    </AuthProvider>
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  clearStoredAuth();
  uiSlot = null;
  // Keep /auth/me out of the picture: the session value drives these tests,
  // which also exercises the R14 session-fallback path.
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: true, user: {} }), {
      status: 500,
    })) as unknown as typeof fetch;
});

test('gate blocks tenancy-only content for a boarder with no confirmed tenancy', async () => {
  setStoredAuth('token', 'refresh', sessionUser('accepted'));
  renderGate('accepted');

  // The router's first paint is async — wait for the gate before asserting.
  await screen.findByText('Not available yet');
  expect(screen.queryByText('tenancy content')).toBeNull();
  expect(screen.getByText('Go to Applications')).toBeDefined();
});

test('gate passes content through once the booking is confirmed', async () => {
  setStoredAuth('token', 'refresh', sessionUser('confirmed'));
  renderGate('confirmed');

  await screen.findByText('tenancy content');
  expect(screen.queryByText('Not available yet')).toBeNull();
});

test('an unknown session status fails safe to the gate (R14)', async () => {
  setStoredAuth('token', 'refresh', sessionUser(undefined));
  renderGate(undefined);

  await screen.findByText('Not available yet');
  expect(screen.queryByText('tenancy content')).toBeNull();
});

test('FeatureGate links back to Applications (R7)', () => {
  uiSlot = <FeatureGate />;
  render(<RouterProvider router={router} />);
  const cta = screen.getByText('Go to Applications');
  expect(cta.closest('a')?.getAttribute('href')).toBe('/boarder/applications');
});
