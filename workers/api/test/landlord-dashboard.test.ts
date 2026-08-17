import { describe, expect, it } from 'bun:test';

import type { Env } from '../src/env';
import app from '../src/index';

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
          monthly: 13500,
          currency: 'PHP',
          trend: 0,
        },
        renewals: {
          upcoming_count: 2,
          period: 'This month',
        },
        payment_alerts: {
          due_soon: 0,
          overdue: 0,
        },
      },
    });
    expect(capturedBinds).toEqual([[3], [3, 3], [3, 3]]);
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
      ])
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { occupancy: { rate: number } } };
    expect(body.data.occupancy.rate).toBe(33.3);
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
