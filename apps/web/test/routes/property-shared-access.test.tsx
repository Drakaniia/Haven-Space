import { afterEach, expect, mock, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { AuthProvider } from '../../src/lib/auth-context';
import { clearStoredAuth, setStoredAuth } from '../../src/lib/auth-store';
import type { AuthUser, LandlordProperty, LandlordPropertyDetail } from '../../src/lib/types';

mock.module('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
    useParams: () => ({ id: '10' }),
    useSearch: () => ({}),
  }),
  Link: ({
    to,
    children,
    className,
  }: {
    to: unknown;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={String(to)} className={className}>
      {children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => () => {},
  useLocation: () => ({
    href: '/landlord/properties/10',
    searchStr: '',
    pathname: '/landlord/properties/10',
  }),
}));

const { LandlordPropertyCards } = await import(
  '../../src/components/properties/LandlordPropertyCards'
);
const propertyDetailRoute = await import('../../src/routes/landlord/properties/$id/index');
const editListingRoute = await import('../../src/routes/landlord/listings/$id/edit');

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
    email: 'lara@example.com',
    role: 'landlord',
    is_verified: true,
    email_verified: true,
    account_status: 'active',
    avatar_url: null,
    phone_number: null,
    verification_status: 'approved',
  };
}

function wrap(node: ReactNode) {
  setStoredAuth('token-1', 'refresh-1', landlord());
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <AuthProvider>
      <QueryClientProvider client={client}>{node}</QueryClientProvider>
    </AuthProvider>
  );
}

function makeListProperty(overrides: Partial<LandlordProperty>): LandlordProperty {
  return {
    id: 10,
    name: 'Haven House',
    type: 'boarding-house',
    description: 'Near campus',
    address: '100 Flow St',
    city: 'Manila',
    province: 'Metro Manila',
    price: 5000,
    status: 'available',
    listing_moderation_status: 'published',
    role: 'owner',
    shared_landlord_count: 0,
    total_rooms: 4,
    occupied_rooms: 1,
    monthly_revenue: 5000,
    created_at: '2026-05-01T00:00:00.000Z',
    amenities: [],
    photos: [],
    pending_applications: 0,
    ...overrides,
  };
}

function makeDetail(overrides: Partial<LandlordPropertyDetail>): LandlordPropertyDetail {
  return {
    id: 10,
    name: 'Haven House',
    type: 'boarding-house',
    gender_preference: 'any',
    description: 'Near campus',
    address: '100 Flow St',
    latitude: '',
    longitude: '',
    city: 'Manila',
    province: 'Metro Manila',
    price: 5000,
    deposit: 1000,
    capacity: '',
    min_stay: '6 months',
    availability: 'available-now',
    status: 'available',
    listing_moderation_status: 'published',
    role: 'owner',
    total_rooms: 2,
    rooms: 2,
    occupied_rooms: 1,
    created_at: '2026-05-01T00:00:00.000Z',
    amenities: [],
    photos: [],
    rules: '',
    monthlyPayment: 5000,
    monthlyDeposit: 1000,
    advancePayment: 'None',
    authorized_landlords: [
      {
        id: 4,
        first_name: 'Omar',
        last_name: 'CoManager',
        email: 'omar@example.com',
        granted_at: '2026-05-02T00:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

test('card note renders Shared access for shared role and Shared with N landlords for owner', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: {
          properties: [
            makeListProperty({ id: 1, name: 'Shared Villa', role: 'shared', shared_landlord_count: 1 }),
            makeListProperty({ id: 2, name: 'Owner Two', role: 'owner', shared_landlord_count: 2 }),
            makeListProperty({ id: 3, name: 'Owner One', role: 'owner', shared_landlord_count: 1 }),
            makeListProperty({ id: 4, name: 'Solo House', role: 'owner', shared_landlord_count: 0 }),
          ],
          total_count: 4,
        },
      }),
      { status: 200 }
    )) as unknown as typeof fetch;

  wrap(<LandlordPropertyCards token="token-1" empty={<p>Empty</p>} />);

  await screen.findByText('Shared Villa');
  expect(screen.getByText('Shared access')).toBeDefined();
  expect(screen.getByText('Shared with 2 landlords')).toBeDefined();
  expect(screen.getByText('Shared with 1 landlord')).toBeDefined();
});

test('detail page shows Shared access and notice without Danger zone for shared role', async () => {
  const DetailPage = (
    propertyDetailRoute.Route as unknown as { options: { component: () => ReactNode } }
  ).options.component;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: makeDetail({
          role: 'shared',
          authorized_landlords: undefined,
          owner: { id: 3, name: 'Lara Landlord One', email: 'lara@example.com' },
        }),
      }),
      { status: 200 }
    )) as unknown as typeof fetch;

  wrap(<DetailPage />);

  await screen.findByText('Shared with you');
  expect(screen.getByText('Shared access')).toBeDefined();
  expect(screen.getByText(/Owned by Lara Landlord One/)).toBeDefined();
  expect(screen.queryByText('lara@example.com')).toBeNull();
  expect(screen.queryByText('Danger zone')).toBeNull();
});

test('detail page shows Danger zone and no shared notice for owner role', async () => {
  const DetailPage = (
    propertyDetailRoute.Route as unknown as { options: { component: () => ReactNode } }
  ).options.component;

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ data: makeDetail({ role: 'owner' }) }), {
      status: 200,
    })) as unknown as typeof fetch;

  wrap(<DetailPage />);

  await screen.findByText('Danger zone');
  expect(screen.queryByText('Shared with you')).toBeNull();
  expect(screen.queryByText('Shared access')).toBeNull();
});

test('edit page remove dialog sends reason, disables while pending, and displays 409 inline', async () => {
  const EditPage = (
    editListingRoute.Route as unknown as { options: { component: () => ReactNode } }
  ).options.component;

  let resolveRemove!: (res: Response) => void;
  let lastRemoveBody: string | undefined;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/access/4/remove')) {
      lastRemoveBody = String(init?.body ?? '');
      return await new Promise<Response>(resolve => {
        resolveRemove = resolve;
      });
    }
    if (url.includes('/api/landlord/rooms')) {
      return new Response(
        JSON.stringify({
          data: {
            property: { id: 10, name: 'Haven House', status: 'available', total_rooms: 1, occupied_rooms: 0 },
            rooms: [{ id: 1, price: 5000 }],
          },
        }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify({ data: makeDetail({ role: 'owner' }) }), { status: 200 });
  }) as unknown as typeof fetch;

  wrap(<EditPage />);

  const removeBtn = await screen.findByRole('button', { name: 'Remove access' });
  fireEvent.click(removeBtn);

  const reasonInput = screen.getByLabelText('Reason (optional)') as HTMLTextAreaElement;
  fireEvent.change(reasonInput, { target: { value: 'Arrangements ended' } });

  const dialogConfirm = screen
    .getAllByRole('button', { name: 'Remove access' })
    .find(btn => btn.closest('[role="dialog"]')) as HTMLButtonElement;
  fireEvent.click(dialogConfirm);

  await waitFor(() => {
    expect(dialogConfirm.disabled).toBe(true);
    expect(reasonInput.disabled).toBe(true);
  });
  expect(lastRemoveBody).toBe(JSON.stringify({ reason: 'Arrangements ended' }));

  resolveRemove(
    new Response(
      JSON.stringify({
        error: 'This landlord does not have active access to this property.',
        code: 'not_shared',
      }),
      { status: 409 }
    )
  );

  await screen.findByText('This landlord does not have active access to this property.');
  expect(screen.getByRole('dialog')).toBeDefined();
});
