import { afterEach, expect, mock, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';

/**
 * Regression guard for spec `payments-page-regressions` (defect A).
 *
 * The four payments pages live under a layout route (`landlord/payments.tsx`,
 * `boarder/payments.tsx`) that already renders `Protected` + `RoleShell`. When a
 * leaf renders `RoleShell` too, the tree gets a second sidebar and topbar — the
 * "two payments pages" screenshot. Rendering one layout around one leaf is
 * exactly the tree the file router builds, so re-adding a shell to a leaf makes
 * the counts below 2 and fails here.
 */

// Registered before the route modules are imported (same pattern as
// `auth-layout.test.tsx`): the routes call `createFileRoute` at module scope.
mock.module('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => ({}) }),
  Link: ({ to, children }: { to: unknown; children: ReactNode }) => (
    <a href={String(to)}>{children}</a>
  ),
  Outlet: () => null,
  useNavigate: () => () => {},
  useLocation: () => ({ href: '/', pathname: '/' }),
}));

afterEach(() => cleanup());

// Every list query on these pages is fine to fail or stay pending; the chrome is
// what is under test, so answer with an empty-but-valid envelope.
globalThis.fetch = (async () =>
  new Response(JSON.stringify({ success: true, data: { charges: [], summary: {} } }), {
    status: 200,
  })) as unknown as typeof fetch;

const { RoleShell } = await import('../../src/components/layout/RoleShell');
const { AuthProvider } = await import('../../src/lib/auth-context');
const { BOARDER_NAV, LANDLORD_NAV } = await import('../../src/lib/nav');

const landlordLedger = await import('../../src/routes/landlord/payments/index');
const landlordRecord = await import('../../src/routes/landlord/payments/record');
const boarderLedger = await import('../../src/routes/boarder/payments/index');
const boarderPay = await import('../../src/routes/boarder/payments/pay');

/** The component the router would render for that route file. */
function componentOf(route: unknown): ComponentType {
  return (route as { options: { component: ComponentType } }).options.component;
}

function renderInLayout(Page: ComponentType, nav: typeof LANDLORD_NAV) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <RoleShell nav={nav}>
          <Page />
        </RoleShell>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function shellCounts() {
  return {
    sidebars: document.querySelectorAll('aside.chrome-sidebar').length,
    topbars: document.querySelectorAll('header.chrome-topbar').length,
  };
}

const PAGES: Array<[string, ComponentType, typeof LANDLORD_NAV, string]> = [
  ['/landlord/payments', componentOf(landlordLedger.Route), LANDLORD_NAV, 'Payments'],
  [
    '/landlord/payments/record',
    componentOf(landlordRecord.Route),
    LANDLORD_NAV,
    'Record a payment',
  ],
  ['/boarder/payments', componentOf(boarderLedger.Route), BOARDER_NAV, 'Payments'],
  ['/boarder/payments/pay', componentOf(boarderPay.Route), BOARDER_NAV, 'Submit a payment'],
];

for (const [path, Page, nav, heading] of PAGES) {
  test(`${path} renders exactly one sidebar and one topbar`, () => {
    renderInLayout(Page, nav);

    expect(shellCounts()).toEqual({ sidebars: 1, topbars: 1 });

    // The page's own heading proves the leaf content rendered at all, so a
    // vacuous "one shell" from an empty render cannot pass.
    expect(document.body.textContent).toContain(heading);
  });
}

// The static counterpart — “no route under a shell layout renders the shell
// itself”, naming the offending file — lives in `route-shell-ownership.test.ts`.
