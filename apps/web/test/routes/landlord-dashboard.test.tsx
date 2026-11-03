import { afterEach, beforeAll, expect, mock, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { AuthProvider } from '../src/lib/auth-context';
import { clearStoredAuth, setStoredAuth } from '../src/lib/auth-store';
import type { AuthUser } from '../src/lib/types';

/**
 * The landlord dashboard's payment card (spec `payments-tracker-redesign` D32).
 *
 * The card sums three counts (`due_today`, `in_grace`, `overdue`) that the API
 * once did not send, which rendered `NaN` — a mismatch the typechecker cannot
 * catch once the response type is widened by hand. This renders the real route
 * component, through the real shell and auth provider, against a stubbed API
 * response.
 *
 * Only the router is mocked: the `Link`/hooks these pages use are the whole
 * contract here, and registering the same mock shape as `payments-shell.test.tsx`
 * keeps both files order-independent (Bun's `mock.module` is process-wide).
 */

mock.module('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => ({}) }),
  Link: ({ to, children }: { to: unknown; children: ReactNode }) => (
    <a href={String(to)}>{children}</a>
  ),
  Outlet: () => null,
  useNavigate: () => () => {},
  useLocation: () => ({ href: '/landlord', searchStr: '', pathname: '/landlord' }),
}));

afterEach(() => {
  cleanup();
  clearStoredAuth();
});

function landlord(): AuthUser {
  return {
    id: 3,
    user_id: 3,
    first_name: 'Lara',
    last_name: 'Landlord',
    email: 'landlord@example.com',
    role: 'landlord',
    is_verified: true,
    email_verified: true,
    account_status: 'active',
    avatar_url: null,
    phone_number: null,
    verification_status: 'approved',
  };
}

/** Every query other than the dashboard answers with an empty envelope. */
function stubApi(alerts: Record<string, number>) {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes('/api/landlord/dashboard-stats')
      ? {
          data: {
            occupancy: { rate: 30, total_rooms: 10, occupied_rooms: 3, trend: 0 },
            revenue: { monthly: 4500, currency: 'PHP', trend: 0 },
            renewals: { upcoming_count: 1, period: 'This month' },
            payment_alerts: alerts,
          },
        }
      : { success: true, data: [] };

    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
}

const dashboard = await import('../src/routes/landlord/index');

/** What the router would render for that route file, shell and gate included. */
function Dashboard() {
  const component = (dashboard.Route as unknown as { options: { component: () => ReactNode } })
    .options.component;

  return <>{component()}</>;
}

async function renderDashboard(alerts: Record<string, number>) {
  stubApi(alerts);
  setStoredAuth('token-1', 'refresh-1', landlord());

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <AuthProvider>
      <QueryClientProvider client={client}>
        <Dashboard />
      </QueryClientProvider>
    </AuthProvider>
  );
}

beforeAll(() => {
  // Keeps the notification bell's query from leaking between tests.
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
    })) as unknown as typeof fetch;
});

test('reads the payment alerts in the tracker vocabulary, never as NaN', async () => {
  await renderDashboard({ due_soon: 2, due_today: 1, in_grace: 3, overdue: 4 });

  // 1 + 3 + 4 — the three states the card counts.
  await screen.findByText('1 due today · 3 in grace · 4 overdue');
  expect(screen.getByText('8')).toBeDefined();
  expect(screen.queryByText(/NaN/)).toBeNull();

  // §8: the card links into the tracker.
  expect(screen.getByRole('link', { name: 'Open tracker' }).getAttribute('href')).toBe(
    '/landlord/payments'
  );
});

test('shows zeroes rather than NaN when nothing is due', async () => {
  await renderDashboard({ due_soon: 0, due_today: 0, in_grace: 0, overdue: 0 });

  await waitFor(() => {
    expect(screen.getByText('0 due today · 0 in grace · 0 overdue')).toBeDefined();
  });
  expect(screen.queryByText(/NaN/)).toBeNull();
});
