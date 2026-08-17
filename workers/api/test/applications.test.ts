import { describe, expect, it } from 'bun:test';

import app from '../src/index';
import type { Env } from '../src/env';
import type { ApplicationDetailRow, ApplicationListRow } from '../src/repositories/applications';

interface D1Response {
  first?: unknown;
  all?: unknown[];
  run?: unknown;
}

function createSequenceDb(responses: D1Response[], capturedBinds: unknown[][] = []): D1Database {
  const responseQueue = [...responses];

  return {
    prepare: () =>
      ({
        bind: (...values: unknown[]) => {
          capturedBinds.push(values);
          const response = responseQueue.shift() ?? {};

          return {
            first: async () => response.first ?? null,
            all: async () => ({ results: response.all ?? [] }),
            run: async () =>
              response.run ?? {
                success: true,
                meta: { last_row_id: 0, changes: 0 },
                results: [],
              },
          };
        },
      } as unknown as D1PreparedStatement),
  } as unknown as D1Database;
}

function createSequenceEnv(responses: D1Response[], capturedBinds: unknown[][] = []): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost',
    JWT_SECRET: 'test-secret',
    DB: createSequenceDb(responses, capturedBinds),
  };
}

const boarderUser = {
  id: 7,
  role: 'boarder',
  is_verified: 1,
  email_verified: 1,
  account_status: 'active',
};

const landlordUser = {
  id: 3,
  role: 'landlord',
  is_verified: 1,
  email_verified: 1,
  account_status: 'active',
};

const boarderApplication: ApplicationListRow = {
  id: 20,
  boarder_id: 7,
  landlord_id: 3,
  room_id: 100,
  message: 'I am interested.',
  status: 'pending',
  payment_method: null,
  confirmed_at: null,
  created_at: '2026-05-01 10:00:00',
  updated_at: '2026-05-01 10:00:00',
  deleted_at: null,
  room_title: 'Single Room',
  room_price: 5000,
  property_title: 'Pine House',
  property_address: '123 Mabini St, Manila, Metro Manila',
  property_id: 10,
  first_name: 'Ana',
  last_name: 'Reyes',
  landlord_email: 'ana@example.com',
};

const landlordApplication: ApplicationListRow = {
  ...boarderApplication,
  first_name: 'Bo',
  last_name: 'Arce',
  email: 'bo@example.com',
};

const applicationDetail: ApplicationDetailRow = {
  id: 20,
  boarder_id: 7,
  landlord_id: 3,
  room_id: 100,
  message: 'I am interested.',
  status: 'pending',
  payment_method: null,
  confirmed_at: null,
  created_at: '2026-05-01 10:00:00',
  updated_at: '2026-05-01 10:00:00',
  deleted_at: null,
  room_title: 'Single Room',
  room_price: 5000,
  property_title: 'Pine House',
  property_address: '123 Mabini St, Manila, Metro Manila',
  property_description: 'Near campus',
  latitude: 14.5995,
  longitude: 120.9842,
  property_id: 10,
  boarder_first_name: 'Bo',
  boarder_last_name: 'Arce',
  boarder_email: 'bo@example.com',
  boarder_avatar: null,
  landlord_first_name: 'Ana',
  landlord_last_name: 'Reyes',
  landlord_email: 'ana@example.com',
  landlord_avatar: null,
};

describe('application read routes', () => {
  it('returns boarder applications with the PHP response shape', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/boarder/applications',
      { headers: { 'X-User-ID': '7' } },
      createSequenceEnv([{ first: boarderUser }, { all: [boarderApplication] }], capturedBinds)
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [boarderApplication] });
    expect(capturedBinds).toEqual([[7], [7]]);
  });

  it('creates a boarder application with the PHP response shape', async () => {
    const capturedBinds: unknown[][] = [];
    const createdApplication = { ...applicationDetail, id: 21 };
    const response = await app.request(
      'http://localhost/api/boarder/applications',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({
          room_id: 100,
          landlord_id: 3,
          message: 'I am interested.',
        }),
      },
      createSequenceEnv(
        [
          { first: boarderUser },
          { first: { id: 100, property_id: 10 } },
          { first: null },
          { run: { success: true, meta: { last_row_id: 21, changes: 1 }, results: [] } },
          { first: createdApplication },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      data: createdApplication,
      message: 'Application created successfully',
      success: true,
    });
    expect(capturedBinds).toEqual([
      [7],
      [100],
      [7, 100],
      [7, 3, 100, 'I am interested.', 'pending'],
      [21],
    ]);
  });

  it('returns PHP-compatible create validation errors', async () => {
    const invalidJsonResponse = await app.request(
      'http://localhost/api/boarder/applications',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({}),
      },
      createSequenceEnv([{ first: boarderUser }])
    );
    const missingMessageResponse = await app.request(
      'http://localhost/api/boarder/applications',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ room_id: 100, landlord_id: 3 }),
      },
      createSequenceEnv([{ first: boarderUser }])
    );

    expect(invalidJsonResponse.status).toBe(400);
    expect(await invalidJsonResponse.json()).toEqual({ error: 'Invalid JSON input' });

    expect(missingMessageResponse.status).toBe(400);
    expect(await missingMessageResponse.json()).toEqual({
      error: 'Missing required field: message',
    });
  });

  it('rejects application creation for a missing room', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/boarder/applications',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({
          room_id: 404,
          landlord_id: 3,
          message: 'I am interested.',
        }),
      },
      createSequenceEnv([{ first: boarderUser }, { first: null }], capturedBinds)
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid room_id: Room does not exist' });
    expect(capturedBinds).toEqual([[7], [404]]);
  });

  it('rejects duplicate active application creation', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/boarder/applications',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({
          room_id: 100,
          landlord_id: 3,
          message: 'I am interested.',
        }),
      },
      createSequenceEnv(
        [
          { first: boarderUser },
          { first: { id: 100, property_id: 10 } },
          { first: { id: 20, status: 'pending', deleted_at: null } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'You have already applied to this room. Status: pending',
    });
    expect(capturedBinds).toEqual([[7], [100], [7, 100]]);
  });

  it('hard deletes a soft-deleted duplicate before creating a new application', async () => {
    const capturedBinds: unknown[][] = [];
    const createdApplication = { ...applicationDetail, id: 22, message: 'I am interested again.' };
    const response = await app.request(
      'http://localhost/api/boarder/applications',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({
          room_id: 100,
          landlord_id: 3,
          message: 'I am interested again.',
        }),
      },
      createSequenceEnv(
        [
          { first: boarderUser },
          { first: { id: 100, property_id: 10 } },
          { first: { id: 55, status: 'cancelled', deleted_at: '2026-05-01 11:00:00' } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 22, changes: 1 }, results: [] } },
          { first: createdApplication },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      data: createdApplication,
      message: 'Application created successfully',
      success: true,
    });
    expect(capturedBinds).toEqual([
      [7],
      [100],
      [7, 100],
      [55],
      [7, 3, 100, 'I am interested again.', 'pending'],
      [22],
    ]);
  });

  it('returns landlord applications with the PHP response shape', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/applications',
      { headers: { 'X-User-ID': '3' } },
      createSequenceEnv([{ first: landlordUser }, { all: [landlordApplication] }], capturedBinds)
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [landlordApplication] });
    expect(capturedBinds).toEqual([[3], [3, 3]]);
  });

  it('updates application status for a verified landlord with the PHP response shape', async () => {
    const capturedBinds: unknown[][] = [];
    const acceptedApplication = { ...applicationDetail, status: 'accepted' };
    const response = await app.request(
      'http://localhost/api/landlord/applications/20/status',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ status: 'accepted' }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: applicationDetail },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { first: acceptedApplication },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: acceptedApplication,
      message: 'Status updated successfully',
    });
    expect(capturedBinds).toEqual([[3], [20], ['accepted', 20], [7], [20]]);
  });

  it('returns PHP-compatible status validation errors', async () => {
    const missingStatusResponse = await app.request(
      'http://localhost/api/landlord/applications/20/status',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({}),
      },
      createSequenceEnv([{ first: landlordUser }])
    );
    const invalidStatusResponse = await app.request(
      'http://localhost/api/landlord/applications/20/status',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ status: 'confirmed' }),
      },
      createSequenceEnv([{ first: landlordUser }])
    );

    expect(missingStatusResponse.status).toBe(400);
    expect(await missingStatusResponse.json()).toEqual({ error: 'Status is required' });

    expect(invalidStatusResponse.status).toBe(400);
    expect(await invalidStatusResponse.json()).toEqual({ error: 'Invalid status: confirmed' });
  });

  it('returns PHP-compatible status update authorization errors', async () => {
    const missingResponse = await app.request(
      'http://localhost/api/landlord/applications/404/status',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ status: 'accepted' }),
      },
      createSequenceEnv([{ first: landlordUser }, { first: null }])
    );
    const unauthorizedResponse = await app.request(
      'http://localhost/api/landlord/applications/20/status',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ status: 'accepted' }),
      },
      createSequenceEnv([
        { first: landlordUser },
        { first: { ...applicationDetail, landlord_id: 99 } },
      ])
    );
    const processedResponse = await app.request(
      'http://localhost/api/landlord/applications/20/status',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ status: 'rejected' }),
      },
      createSequenceEnv([
        { first: landlordUser },
        { first: { ...applicationDetail, status: 'accepted' } },
      ])
    );
    const confirmedResponse = await app.request(
      'http://localhost/api/landlord/applications/20/status',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ status: 'accepted' }),
      },
      createSequenceEnv([
        { first: landlordUser },
        { first: { ...applicationDetail, status: 'confirmed' } },
      ])
    );
    const endedResponse = await app.request(
      'http://localhost/api/landlord/applications/20/status',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ status: 'rejected' }),
      },
      createSequenceEnv([
        { first: landlordUser },
        { first: { ...applicationDetail, status: 'ended' } },
      ])
    );

    expect(missingResponse.status).toBe(403);
    expect(await missingResponse.json()).toEqual({ error: 'Application not found' });

    expect(unauthorizedResponse.status).toBe(403);
    expect(await unauthorizedResponse.json()).toEqual({ error: 'Unauthorized' });

    expect(processedResponse.status).toBe(403);
    expect(await processedResponse.json()).toEqual({
      error: 'Application has already been processed',
    });

    expect(confirmedResponse.status).toBe(403);
    expect(await confirmedResponse.json()).toEqual({
      error: 'Application has already been processed',
    });

    expect(endedResponse.status).toBe(403);
    expect(await endedResponse.json()).toEqual({
      error: 'Application has already been processed',
    });
  });

  it('requires a verified landlord for application status updates', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/applications/20/status',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ status: 'accepted' }),
      },
      createSequenceEnv([{ first: { ...landlordUser, is_verified: 0 } }])
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Account verification required',
      code: 'VERIFICATION_REQUIRED',
      message:
        'Your account is pending verification. Write operations are not allowed until an admin approves your account.',
    });
  });

  it('returns application detail for the owning boarder or landlord', async () => {
    const boarderResponse = await app.request(
      'http://localhost/api/boarder/applications/20',
      { headers: { 'X-User-ID': '7' } },
      createSequenceEnv([{ first: boarderUser }, { first: applicationDetail }])
    );
    const landlordResponse = await app.request(
      'http://localhost/api/landlord/applications/20',
      { headers: { 'X-User-ID': '3' } },
      createSequenceEnv([{ first: landlordUser }, { first: applicationDetail }])
    );

    expect(boarderResponse.status).toBe(200);
    expect(await boarderResponse.json()).toEqual({ data: applicationDetail });

    expect(landlordResponse.status).toBe(200);
    expect(await landlordResponse.json()).toEqual({ data: applicationDetail });
  });

  it('deletes a boarder application with the PHP response shape', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/boarder/applications/20',
      {
        method: 'DELETE',
        headers: { 'X-User-ID': '7' },
      },
      createSequenceEnv(
        [
          { first: boarderUser },
          { first: applicationDetail },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'Application deleted successfully' });
    expect(capturedBinds).toEqual([[7], [20], [20]]);
  });

  it('returns PHP-compatible delete errors for missing and invalid applications', async () => {
    const missingResponse = await app.request(
      'http://localhost/api/boarder/applications/404',
      {
        method: 'DELETE',
        headers: { 'X-User-ID': '7' },
      },
      createSequenceEnv([{ first: boarderUser }, { first: null }])
    );
    const invalidIdResponse = await app.request(
      'http://localhost/api/boarder/applications/not-a-number',
      {
        method: 'DELETE',
        headers: { 'X-User-ID': '7' },
      },
      createSequenceEnv([{ first: boarderUser }])
    );

    expect(missingResponse.status).toBe(403);
    expect(await missingResponse.json()).toEqual({ error: 'Application not found' });

    expect(invalidIdResponse.status).toBe(403);
    expect(await invalidIdResponse.json()).toEqual({ error: 'Application not found' });
  });

  it('blocks withdrawing a confirmed application (state machine)', async () => {
    const response = await app.request(
      'http://localhost/api/boarder/applications/20',
      {
        method: 'DELETE',
        headers: { 'X-User-ID': '7' },
      },
      createSequenceEnv([
        { first: boarderUser },
        { first: { ...applicationDetail, status: 'confirmed' } },
      ])
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'This application can no longer be withdrawn. Contact your landlord for assistance.',
    });
  });

  it('blocks withdrawing an already-ended application (state machine)', async () => {
    const response = await app.request(
      'http://localhost/api/boarder/applications/20',
      {
        method: 'DELETE',
        headers: { 'X-User-ID': '7' },
      },
      createSequenceEnv([
        { first: boarderUser },
        { first: { ...applicationDetail, status: 'rejected' } },
      ])
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'This application can no longer be withdrawn. Contact your landlord for assistance.',
    });
  });

  it('marks a withdrawn application as cancelled before soft-deleting it', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/boarder/applications/20',
      {
        method: 'DELETE',
        headers: { 'X-User-ID': '7' },
      },
      createSequenceEnv(
        [
          { first: boarderUser },
          { first: { ...applicationDetail, status: 'accepted' } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'Application deleted successfully' });
    expect(capturedBinds).toEqual([[7], [20], [20]]);
  });

  it('rejects delete when the boarder does not own the application', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/boarder/applications/20',
      {
        method: 'DELETE',
        headers: { 'X-User-ID': '7' },
      },
      createSequenceEnv(
        [{ first: boarderUser }, { first: { ...applicationDetail, boarder_id: 99 } }],
        capturedBinds
      )
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(capturedBinds).toEqual([[7], [20]]);
  });

  it('confirms an accepted boarder application with the PHP response shape', async () => {
    const capturedBinds: unknown[][] = [];
    const acceptedApplication = { ...applicationDetail, status: 'accepted' };
    const confirmedApplication = {
      ...applicationDetail,
      status: 'confirmed',
      payment_method: 'cash',
      confirmed_at: '2026-05-02 10:00:00',
    };
    const response = await app.request(
      'http://localhost/api/boarder/applications/20/confirm',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ payment_method: 'cash' }),
      },
      createSequenceEnv(
        [
          { first: boarderUser },
          { first: acceptedApplication },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 2 }, results: [] } },
          { first: confirmedApplication },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: confirmedApplication,
      message: 'Booking confirmed successfully',
      success: true,
    });
    expect(capturedBinds).toEqual([
      [7],
      [20],
      ['cash', 20],
      [100],
      ['accepted', 7],
      ['cancelled', 7, 20, 'pending', 'accepted'],
      [20],
    ]);
  });

  it('returns PHP-compatible confirm validation errors', async () => {
    const missingPaymentResponse = await app.request(
      'http://localhost/api/boarder/applications/20/confirm',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({}),
      },
      createSequenceEnv([{ first: boarderUser }])
    );
    const invalidIdResponse = await app.request(
      'http://localhost/api/boarder/applications/not-a-number/confirm',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ payment_method: 'cash' }),
      },
      createSequenceEnv([{ first: boarderUser }])
    );

    expect(missingPaymentResponse.status).toBe(400);
    expect(await missingPaymentResponse.json()).toEqual({ error: 'Payment method is required' });

    expect(invalidIdResponse.status).toBe(403);
    expect(await invalidIdResponse.json()).toEqual({ error: 'Application not found' });
  });

  it('rejects confirmation for missing, unauthorized, or non-accepted applications', async () => {
    const missingResponse = await app.request(
      'http://localhost/api/boarder/applications/404/confirm',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ payment_method: 'cash' }),
      },
      createSequenceEnv([{ first: boarderUser }, { first: null }])
    );
    const unauthorizedResponse = await app.request(
      'http://localhost/api/boarder/applications/20/confirm',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ payment_method: 'cash' }),
      },
      createSequenceEnv([
        { first: boarderUser },
        { first: { ...applicationDetail, boarder_id: 99 } },
      ])
    );
    const pendingResponse = await app.request(
      'http://localhost/api/boarder/applications/20/confirm',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ payment_method: 'cash' }),
      },
      createSequenceEnv([{ first: boarderUser }, { first: applicationDetail }])
    );

    expect(missingResponse.status).toBe(403);
    expect(await missingResponse.json()).toEqual({ error: 'Application not found' });

    expect(unauthorizedResponse.status).toBe(403);
    expect(await unauthorizedResponse.json()).toEqual({ error: 'Unauthorized' });

    expect(pendingResponse.status).toBe(403);
    expect(await pendingResponse.json()).toEqual({
      error: 'Only accepted applications can be confirmed',
    });
  });

  it('returns PHP-compatible application not-found behavior', async () => {
    const missingResponse = await app.request(
      'http://localhost/api/boarder/applications/404',
      { headers: { 'X-User-ID': '7' } },
      createSequenceEnv([{ first: boarderUser }, { first: null }])
    );
    const unauthorizedOwnerResponse = await app.request(
      'http://localhost/api/boarder/applications/20',
      { headers: { 'X-User-ID': '7' } },
      createSequenceEnv([
        { first: boarderUser },
        { first: { ...applicationDetail, boarder_id: 99 } },
      ])
    );

    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toEqual({ error: 'Application not found' });

    expect(unauthorizedOwnerResponse.status).toBe(404);
    expect(await unauthorizedOwnerResponse.json()).toEqual({ error: 'Application not found' });
  });
});
