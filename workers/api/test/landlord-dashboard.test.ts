import { describe, expect, it } from 'bun:test';

import type { Env } from '../src/env';
import app from '../src/index';
import { addDays, manilaToday } from '../src/repositories/payments/helpers';

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

describe('landlord dashboard stats routes', () => {
  it('returns dashboard stats with the PHP response shape and  alias', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/dashboard-stats',
      {
        headers: {
          'X-User-ID': '3',
        },
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: { total_rooms: 4, occupied_rooms: 3, monthly_revenue: 13500 } },
          { first: { upcoming_renewals: 2 } },
          // Revenue is now *collected* money, so the ledger decides it (spec F6).
          {
            all: [
              {
                id: 501,
                application_id: 20,
                boarder_id: 7,
                landlord_id: 3,
                room_id: 11,
                property_id: 10,
                amount: 4500,
                late_fee: 0,
                due_date: '2026-06-20',
                paid_date: new Date().toISOString().slice(0, 10),
                status: 'paid',
                charge_type: 'rent',
                grace_days: 3,
                created_at: '2026-06-01 08:00:00',
              },
            ],
          },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        occupancy: {
          rate: 75,
          total_rooms: 4,
          occupied_rooms: 3,
          trend: 0,
        },
        revenue: {
          monthly: 4500,
          currency: 'PHP',
          trend: 0,
        },
        renewals: {
          upcoming_count: 2,
          period: 'This month',
        },
        payment_alerts: {
          due_soon: 0,
          due_today: 0,
          in_grace: 0,
          overdue: 0,
        },
      },
    });
    expect(capturedBinds).toEqual([[3], [3, 3], [3, 3], [3, 3], [501]]);
  });

  it('returns zeroed dashboard stats when the landlord has no rooms', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/dashboard-stats',
      {
        headers: {
          'X-User-ID': '3',
        },
      },
      createSequenceEnv([
        { first: landlordUser },
        { first: { total_rooms: 0, occupied_rooms: null, monthly_revenue: null } },
        { first: { upcoming_renewals: 0 } },
        { all: [] },
      ])
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        occupancy: {
          rate: 0,
          total_rooms: 0,
          occupied_rooms: 0,
          trend: 0,
        },
        revenue: {
          monthly: 0,
          currency: 'PHP',
          trend: 0,
        },
        renewals: {
          upcoming_count: 0,
          period: 'This month',
        },
        payment_alerts: {
          due_soon: 0,
          due_today: 0,
          in_grace: 0,
          overdue: 0,
        },
      },
    });
  });

  it('keeps the documented non-php dashboard stats alias', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/dashboard/stats',
      {
        headers: {
          'X-User-ID': '3',
        },
      },
      createSequenceEnv([
        { first: landlordUser },
        { first: { total_rooms: 3, occupied_rooms: 1, monthly_revenue: 4500 } },
        { first: { upcoming_renewals: 1 } },
        { all: [] },
      ])
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { occupancy: { rate: number } } };
    expect(body.data.occupancy.rate).toBe(33.3);
  });

  it('counts the payment alerts in the tracker vocabulary (D32)', async () => {
    const today = manilaToday();
    const charge = (id: number, dueDate: string) => ({
      id,
      application_id: 20,
      boarder_id: 7,
      landlord_id: 3,
      room_id: 11,
      property_id: 10,
      amount: 1000,
      late_fee: 0,
      due_date: dueDate,
      paid_date: null,
      status: 'pending',
      charge_type: 'rent',
      grace_days: 3,
      created_at: '2026-06-01 08:00:00',
    });

    const response = await app.request(
      'http://localhost/api/landlord/dashboard-stats',
      {
        headers: {
          'X-User-ID': '3',
        },
      },
      createSequenceEnv([
        { first: landlordUser },
        { first: { total_rooms: 2, occupied_rooms: 1, monthly_revenue: 4500 } },
        { first: { upcoming_renewals: 1 } },
        {
          all: [
            charge(601, today),
            charge(602, addDays(today, -1)),
            charge(603, addDays(today, -10)),
            charge(604, addDays(today, 2)),
          ],
        },
      ])
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      data: { payment_alerts: Record<string, number>; revenue: { monthly: number } };
    };

    // Due today, past due but inside the 3-day grace, past grace, and due soon —
    // the same buckets the tracker's summary cards show.
    expect(body.data.payment_alerts).toEqual({
      due_soon: 1,
      due_today: 1,
      in_grace: 1,
      overdue: 1,
    });
    expect(body.data.revenue.monthly).toBe(0);
  });

  it('requires a landlord role for dashboard stats', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/dashboard-stats',
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
