import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LandlordDocumentsModal } from '../../src/components/admin/LandlordDocumentsModal';
import type { AdminLandlordDetail } from '../../src/lib/types';

afterEach(() => cleanup());

function detail(overrides: Partial<AdminLandlordDetail> = {}): AdminLandlordDetail {
  return {
    id: 3,
    first_name: 'Lina',
    last_name: 'Santos',
    email: 'lina@example.com',
    is_verified: 0,
    created_at: '2026-09-01 08:00:00',
    boarding_house_name: "Lina's Boarding House",
    property_locations: [],
    verification_status: 'pending',
    verification_note: null,
    documents_complete: false,
    missing_documents: ['business_permit', 'selfie_with_id'],
    documents: [
      {
        document_type: 'government_id',
        file_name: 'id.jpg',
        file_size: 1228800,
        file_type: 'image/jpeg',
        file_url: 'https://utfs.io/f/id-key',
        uploaded_at: '2026-09-28 10:11:12',
      },
      {
        document_type: 'proof_of_ownership',
        file_name: 'deed.pdf',
        file_size: 2048,
        file_type: 'application/pdf',
        file_url: 'https://utfs.io/f/deed-key',
        uploaded_at: '2026-09-28 10:12:00',
      },
    ],
    ...overrides,
  };
}

function renderModal(payload: AdminLandlordDetail, onNotify = () => {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <LandlordDocumentsModal
        landlordId={payload.id}
        token="token"
        onClose={() => {}}
        onNotify={onNotify}
      />
    </QueryClientProvider>
  );
}

function stubFetch(payload: AdminLandlordDetail, requests: { url: string; body: unknown }[] = []) {
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    requests.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null });

    // Decisions are POSTs; the detail read is the GET that precedes them.
    const body =
      init?.method === 'POST'
        ? { message: 'Landlord verification updated successfully' }
        : { data: payload };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;

  return requests;
}

test('renders every slot and blocks approval while documents are missing', async () => {
  stubFetch(detail());
  renderModal(detail());

  expect(await screen.findByText('Verification documents — Lina Santos')).toBeDefined();
  expect(screen.getByText('lina@example.com')).toBeDefined();
  expect(screen.getByText("Lina's Boarding House")).toBeDefined();
  expect(screen.getByText('2 of 4 documents')).toBeDefined();

  for (const label of [
    'Valid government ID',
    'Proof of property ownership',
    'Business permit',
    'Selfie holding the ID',
  ]) {
    expect(screen.getByText(label)).toBeDefined();
  }

  expect(screen.getAllByText('Not submitted')).toHaveLength(2);
  expect(screen.getByText('Missing: Business permit, Selfie holding the ID')).toBeDefined();

  const approve = screen.getByText('Approve').closest('button');
  expect(approve?.hasAttribute('disabled')).toBe(true);
});

test('enables approval once all four documents are on file', async () => {
  const complete = detail({
    documents_complete: true,
    missing_documents: [],
    documents: [
      ...detail().documents,
      {
        document_type: 'business_permit',
        file_name: 'permit.jpg',
        file_size: 1024,
        file_type: 'image/jpeg',
        file_url: 'https://utfs.io/f/permit-key',
        uploaded_at: '2026-09-28 10:13:00',
      },
      {
        document_type: 'selfie_with_id',
        file_name: 'selfie.jpg',
        file_size: 1024,
        file_type: 'image/jpeg',
        file_url: 'https://utfs.io/f/selfie-key',
        uploaded_at: '2026-09-28 10:14:00',
      },
    ],
  });
  stubFetch(complete);
  renderModal(complete);

  expect(await screen.findByText('4 of 4 documents')).toBeDefined();
  await waitFor(() =>
    expect(screen.getByText('Approve').closest('button')?.hasAttribute('disabled')).toBe(false)
  );
  expect(screen.queryByText(/^Missing:/)).toBeNull();
});

test('sends a reject decision with the typed reason', async () => {
  const requests = stubFetch(detail());
  const notifications: string[] = [];
  renderModal(detail(), message => notifications.push(message));

  fireEvent.click(await screen.findByText('Reject'));
  fireEvent.change(screen.getByLabelText('Reason for rejection (optional)'), {
    target: { value: 'The permit photo is blurry.' },
  });
  fireEvent.click(screen.getByText('Reject verification'));

  await waitFor(() =>
    expect(notifications).toEqual(['Landlord verification updated successfully'])
  );
  // The success path refetches the detail, so look at the last request that carried a body.
  expect(requests.filter(request => request.body).at(-1)?.body).toEqual({
    landlordId: 3,
    action: 'reject',
    reason: 'The permit photo is blurry.',
  });
});

test('sends a request-documents nudge without deciding the bundle', async () => {
  const requests = stubFetch(detail());
  renderModal(detail());

  fireEvent.click(await screen.findByText('Request documents'));
  fireEvent.click(screen.getByText('Request documents', { selector: 'button' }));

  await waitFor(() =>
    expect(requests.filter(request => request.body).at(-1)?.body).toEqual({
      landlordId: 3,
      action: 'request_documents',
      reason: null,
    })
  );
});

test('renders nothing when no landlord is selected', () => {
  const queryClient = new QueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <LandlordDocumentsModal landlordId={null} token="token" onClose={() => {}} />
    </QueryClientProvider>
  );

  expect(screen.queryByText('Verification documents')).toBeNull();
});
