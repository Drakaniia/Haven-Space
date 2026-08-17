import { describe, expect, it } from 'bun:test';

import type { Env } from '../src/env';
import app from '../src/index';
import type { LandlordBoarderRow } from '../src/repositories/landlord-boarders';

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

const landlordUser = {
  id: 3,
  role: 'landlord',
  is_verified: 1,
  email_verified: 1,
  account_status: 'active',
};

const boarderUser = {
  id: 7,
  role: 'boarder',
  is_verified: 1,
  email_verified: 1,
  account_status: 'active',
};

const propertyRow = {
  id: 10,
  title: 'Pine House',
  status: 'available',
};

const roomRow = {
  id: 11,
  property_id: 10,
  landlord_id: 3,
  title: 'Room 1',
  room_number: 'Room 1',
  room_type: 'single',
  description: '',
  price: 4500,
  deposit: 1000,
  status: 'available',
  capacity: 1,
  size: null,
  created_at: '2026-05-01 09:00:00',
  updated_at: '2026-05-01 09:00:00',
};

const boarderRow: LandlordBoarderRow = {
  application_id: 20,
  id: 7,
  first_name: 'Bea',
  last_name: 'Santos',
  email: 'bea@example.com',
  phone_number: null,
  avatar_url: null,
  room_id: 11,
  room_title: 'Room 1',
  rent: 4500,
  deposit: 1000,
  move_in_date: '2026-05-01 09:00:00',
  application_message: 'I am interested.',
  leave_request_status: null,
  intended_leave_date: null,
  leave_request_reason: null,
};

describe('landlord boarder routes', () => {
  it('returns landlord boarders with the PHP response shape and  alias', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/boarders?propertyId=10',
      {
        headers: {
          'X-User-ID': '3',
        },
      },
      createSequenceEnv(
        [{ first: landlordUser }, { first: propertyRow }, { all: [boarderRow] }],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        boarders: [
          {
            id: 7,
            application_id: 20,
            first_name: 'Bea',
            last_name: 'Santos',
            email: 'bea@example.com',
            phone: null,
            avatar_url: null,
            room_id: 11,
            room_title: 'Room 1',
            rent: 4500,
            deposit: 1000,
            move_in_date: '2026-05-01 09:00:00',
            application_message: 'I am interested.',
            status: 'active',
            leave_request_status: 'none',
            intended_leave_date: null,
            leave_request_reason: null,
            payment_status: 'paid',
            payment_due_day: 15,
            last_payment_date: null,
          },
        ],
        total_count: 1,
      },
    });
    expect(capturedBinds).toEqual([[3], [10, 3, 3], [10]]);
  });

  it('maps pending and approved leave requests to leaving statuses', async () => {
    const pendingRow: LandlordBoarderRow = { ...boarderRow, leave_request_status: 'pending' };
    const approvedRow: LandlordBoarderRow = { ...boarderRow, leave_request_status: 'approved' };

    const response = await app.request(
      'http://localhost/api/landlord/boarders?propertyId=10',
      {
        headers: {
          'X-User-ID': '3',
        },
      },
      createSequenceEnv([
        { first: landlordUser },
        { first: propertyRow },
        { all: [pendingRow, approvedRow] },
      ])
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { boarders: Array<{ application_id: number; status: string }> };
    };
    expect(body.data.boarders.map(b => b.status)).toEqual(['leaving', 'leaving_approved']);
  });

  it('returns an empty boarder list from the clean route alias', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/boarders?propertyId=10',
      {
        headers: {
          'X-User-ID': '3',
        },
      },
      createSequenceEnv([{ first: landlordUser }, { first: propertyRow }, { all: [] }])
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        boarders: [],
        total_count: 0,
      },
    });
  });

  it('returns PHP-compatible validation and property errors', async () => {
    const missingPropertyId = await app.request(
      'http://localhost/api/landlord/boarders',
      {
        headers: {
          'X-User-ID': '3',
        },
      },
      createSequenceEnv([{ first: landlordUser }])
    );
    const missingProperty = await app.request(
      'http://localhost/api/landlord/boarders?propertyId=404',
      {
        headers: {
          'X-User-ID': '3',
        },
      },
      createSequenceEnv([{ first: landlordUser }, { first: null }])
    );

    expect(missingPropertyId.status).toBe(400);
    expect(await missingPropertyId.json()).toEqual({ error: 'propertyId is required' });
    expect(missingProperty.status).toBe(404);
    expect(await missingProperty.json()).toEqual({ error: 'Property not found' });
  });

  it('creates a manual boarder with the PHP response shape', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/boarders',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          property_id: 10,
          first_name: 'Nia',
          last_name: 'Cruz',
          email: 'nia@example.com',
          room_id: 11,
          move_in_date: '2026-05-29',
        }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: propertyRow },
          { first: roomRow },
          { first: null },
          { run: { success: true, meta: { last_row_id: 8, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 30, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        message: 'Boarder added successfully',
        boarder_id: 8,
      },
    });
    expect(capturedBinds).toEqual([
      [3],
      [10, 3, 3],
      [11, 10],
      ['nia@example.com'],
      ['Nia', 'Cruz', 'nia@example.com'],
      [8, 3, 11, '2026-05-29'],
    ]);
  });

  it('creates a manual boarder application for an existing user', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/boarders',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          property_id: 10,
          first_name: 'Bea',
          last_name: 'Santos',
          email: 'bea@example.com',
          room_id: 11,
          move_in_date: '2026-05-29',
        }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: propertyRow },
          { first: roomRow },
          { first: { id: 7 } },
          { run: { success: true, meta: { last_row_id: 31, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        message: 'Boarder added successfully',
        boarder_id: 7,
      },
    });
    expect(capturedBinds).toEqual([
      [3],
      [10, 3, 3],
      [11, 10],
      ['bea@example.com'],
      [7, 3, 11, '2026-05-29'],
    ]);
  });

  it('returns PHP-compatible manual boarder create errors', async () => {
    const missingField = await app.request(
      'http://localhost/api/landlord/boarders',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          property_id: 10,
          first_name: 'Nia',
          last_name: 'Cruz',
          room_id: 11,
        }),
      },
      createSequenceEnv([{ first: landlordUser }])
    );
    const missingRoom = await app.request(
      'http://localhost/api/landlord/boarders',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          property_id: 10,
          first_name: 'Nia',
          last_name: 'Cruz',
          email: 'nia@example.com',
          room_id: 404,
        }),
      },
      createSequenceEnv([{ first: landlordUser }, { first: propertyRow }, { first: null }])
    );

    expect(missingField.status).toBe(400);
    expect(await missingField.json()).toEqual({ error: 'Missing required field: email' });
    expect(missingRoom.status).toBe(404);
    expect(await missingRoom.json()).toEqual({ error: 'Room not found or access denied' });
  });

  it('updates a manual boarder with the PHP response shape', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/boarders',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          id: 7,
          property_id: 10,
          first_name: 'Bea',
          last_name: 'Reyes',
          email: 'bea.reyes@example.com',
          room_id: 11,
          move_in_date: '2026-06-01',
          rent: 5000,
          deposit: 1500,
        }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: propertyRow },
          { first: { id: 20, room_id: 11 } },
          { first: roomRow },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        message: 'Boarder updated successfully',
        boarder_id: 7,
      },
    });
    expect(capturedBinds).toEqual([
      [3],
      [10, 3, 3],
      [7, 10],
      [11, 10],
      ['Bea', 'Reyes', 'bea.reyes@example.com', 7],
      [11, '2026-06-01', 20],
      [5000, 1500, 11, 10],
    ]);
  });

  it('returns PHP-compatible manual boarder update errors', async () => {
    const missingField = await app.request(
      'http://localhost/api/landlord/boarders',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          id: 7,
          property_id: 10,
          first_name: 'Bea',
          last_name: 'Reyes',
          room_id: 11,
        }),
      },
      createSequenceEnv([{ first: landlordUser }])
    );
    const missingBoarder = await app.request(
      'http://localhost/api/landlord/boarders',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          id: 404,
          property_id: 10,
          first_name: 'Bea',
          last_name: 'Reyes',
          email: 'bea.reyes@example.com',
          room_id: 11,
        }),
      },
      createSequenceEnv([{ first: landlordUser }, { first: propertyRow }, { first: null }])
    );

    expect(missingField.status).toBe(400);
    expect(await missingField.json()).toEqual({ error: 'Missing required field: email' });
    expect(missingBoarder.status).toBe(404);
    expect(await missingBoarder.json()).toEqual({ error: 'Boarder not found' });
  });

  it('removes a manual boarder with the PHP response shape', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/boarders?id=7',
      {
        method: 'DELETE',
        headers: {
          'X-User-ID': '3',
        },
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        message: 'Boarder removed successfully',
      },
    });
    expect(capturedBinds).toEqual([[3], [7, 3, 3]]);
  });

  it('returns PHP-compatible manual boarder delete errors', async () => {
    const missingId = await app.request(
      'http://localhost/api/landlord/boarders',
      {
        method: 'DELETE',
        headers: {
          'X-User-ID': '3',
        },
      },
      createSequenceEnv([{ first: landlordUser }])
    );
    const missingBoarder = await app.request(
      'http://localhost/api/landlord/boarders?id=404',
      {
        method: 'DELETE',
        headers: {
          'X-User-ID': '3',
        },
      },
      createSequenceEnv([
        { first: landlordUser },
        { run: { success: true, meta: { last_row_id: 0, changes: 0 }, results: [] } },
      ])
    );

    expect(missingId.status).toBe(400);
    expect(await missingId.json()).toEqual({ error: 'Boarder id is required' });
    expect(missingBoarder.status).toBe(404);
    expect(await missingBoarder.json()).toEqual({ error: 'Boarder not found' });
  });

  it('requires a landlord role for landlord boarders', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/boarders?propertyId=10',
      {
        headers: {
          'X-User-ID': '7',
        },
      },
      createSequenceEnv([{ first: boarderUser }])
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Forbidden: You do not have permission to access this resource',
    });
  });
});
