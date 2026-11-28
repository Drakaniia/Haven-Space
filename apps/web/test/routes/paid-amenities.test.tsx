import { afterEach, expect, mock, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';

mock.module('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => ({}) }),
  Link: ({ to, children }: { to: unknown; children: ReactNode }) => (
    <a href={String(to)}>{children}</a>
  ),
  Outlet: () => null,
  useNavigate: () => () => {},
  useLocation: () => ({ href: '/', pathname: '/' }),
}));

afterEach(() => {
  cleanup();
  clearStoredAuth();
});

const { AuthProvider } = await import('../../src/lib/auth-context');
const { clearStoredAuth, setStoredAuth } = await import('../../src/lib/auth-store');
const { BOARDER_LIMITED_NAV, BOARDER_NAV, LANDLORD_NAV } = await import('../../src/lib/nav');
const { CHARGE_TYPE_LABELS } = await import('../../src/lib/payments');
const landlordAmenitiesRoute = await import('../../src/routes/landlord/payments/amenities');
const boarderAmenitiesRoute = await import('../../src/routes/boarder/payments/amenities');

function componentOf(route: unknown): ComponentType {
  return (route as { options: { component: ComponentType } }).options.component;
}

function renderWithAuth(Page: ComponentType, role: 'landlord' | 'boarder') {
  setStoredAuth('test-token', 'refresh-1', {
    id: 1,
    user_id: 1,
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    role,
    is_verified: true,
    email_verified: true,
    account_status: 'active',
    avatar_url: null,
    phone_number: null,
    verification_status: 'approved',
    boarder_status: 'confirmed',
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <AuthProvider>
      <QueryClientProvider client={client}>
        <Page />
      </QueryClientProvider>
    </AuthProvider>
  );
}

test('nav places Amenities under Payments for landlord and confirmed boarder only', () => {
  expect(
    LANDLORD_NAV.some(item => item.to === '/landlord/payments/amenities' && item.group === 'Payments')
  ).toBe(true);
  expect(
    BOARDER_NAV.some(item => item.to === '/boarder/payments/amenities' && item.group === 'Payments')
  ).toBe(true);
  expect(BOARDER_LIMITED_NAV.some(item => item.to.includes('amenities'))).toBe(false);
  expect(CHARGE_TYPE_LABELS.amenity).toBe('Amenity');
});

test('landlord Amenities page renders catalog, pending requests, and subscriptions', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes('/api/landlord/properties')) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { properties: [{ id: 10, name: 'Flow House' }] },
        }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          property: { id: 10, title: 'Flow House' },
          catalog: [
            {
              id: 1,
              property_id: 10,
              name: 'Parking Slot',
              description: 'Covered motorcycle bay',
              icon: 'parking',
              billing_model: 'monthly',
              price: 600,
              unit_label: 'slot',
              is_metered: false,
              is_included: false,
              max_slots: 4,
              active_slots: 1,
              allow_boarder_request: true,
              is_active: true,
              created_at: '2026-11-01',
            },
          ],
          subscriptions: [],
          pending_requests: { subscriptions: [], usage: [] },
          usage_logs: [],
          boarders: [],
          summary: {
            active_catalog_count: 1,
            monthly_recurring_revenue: 600,
            pending_requests_count: 0,
            month_billed: 600,
            month_collected: 600,
          },
        },
      }),
      { status: 200 }
    );
  }) as unknown as typeof fetch;

  const Page = componentOf(landlordAmenitiesRoute.Route);
  renderWithAuth(Page, 'landlord');

  expect(await screen.findByText('Parking Slot')).toBeTruthy();
  expect(screen.getByText(/Covered motorcycle bay/)).toBeTruthy();
  expect(screen.getByText(/Slots: 1 \/ 4/)).toBeTruthy();
});

test('boarder Amenities page disables full catalog items and shows active subscriptions', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        success: true,
        data: {
          tenancy: {
            application_id: 200,
            property_id: 10,
            property_title: 'Flow House',
            room_title: 'Room A1',
          },
          active_monthly_total: 400,
          catalog: [
            {
              id: 1,
              property_id: 10,
              name: 'Parking Slot',
              description: null,
              icon: 'parking',
              billing_model: 'monthly',
              price: 600,
              unit_label: 'slot',
              is_metered: false,
              is_included: false,
              max_slots: 2,
              active_slots: 2,
              allow_boarder_request: true,
              is_active: true,
              created_at: '2026-11-01',
            },
          ],
          subscriptions: [
            {
              id: 5,
              paid_amenity_id: 2,
              amenity_name: 'Mini-Fridge',
              amenity_icon: 'kitchen',
              unit_label: 'unit',
              application_id: 200,
              property_id: 10,
              boarder_id: 2,
              boarder_name: 'Benny Boarder',
              room_id: 100,
              room_title: 'Room A1',
              status: 'active',
              quantity: 1,
              unit_price_snapshot: 400,
              billing_model_snapshot: 'monthly',
              next_bill_date: '2026-12-20',
              last_billed_date: '2026-11-20',
              notes: null,
              rejection_reason: null,
              created_at: '2026-11-20',
            },
          ],
          usage_logs: [],
          charges: [],
        },
      }),
      { status: 200 }
    )) as unknown as typeof fetch;

  const Page = componentOf(boarderAmenitiesRoute.Route);
  renderWithAuth(Page, 'boarder');

  expect(await screen.findByText('Mini-Fridge')).toBeTruthy();
  expect(screen.getByText('No slots available')).toBeTruthy();
  const fullBtn = screen.getByRole('button', { name: 'Full' }) as HTMLButtonElement;
  expect(fullBtn.disabled).toBe(true);
});
