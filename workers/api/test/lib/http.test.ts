import { describe, expect, it } from 'bun:test';

import {
  HttpError,
  SCHEMA_STALE_CODE,
  errorResponse,
  isSchemaStaleError,
  jsonResponse,
  responseFromError,
} from '../../src/lib/http';

describe('http helpers', () => {
  it('returns JSON responses with a stable content type', async () => {
    const response = jsonResponse({ status: 'success' }, 201);

    expect(response.status).toBe(201);
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(await response.json()).toEqual({ status: 'success' });
  });

  it('returns structured error responses', async () => {
    const response = errorResponse(422, 'Invalid input', {
      code: 'validation_error',
      details: { field: 'email' },
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'Invalid input',
      code: 'validation_error',
      details: { field: 'email' },
    });
  });

  it('converts HttpError instances to JSON responses', async () => {
    const response = responseFromError(
      new HttpError(401, 'Missing bearer token', { code: 'unauthorized' })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Missing bearer token',
      code: 'unauthorized',
    });
  });

  it('keeps the generic 500 for an unclassified error', async () => {
    const response = responseFromError(new Error('boom'));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });

  /*
    A database that predates the code used to read as a bare "Internal server
    error", which looks like a server bug rather than an unapplied migration
    (spec `payments-shell-reverification` D6). SQLite reports the mismatch as a
    plain `Error`, so the mapping is message-based and must cover each phrasing
    it uses.
  */
  for (const message of [
    'no such column: pr.late_fee_grace_days',
    'SQLITE_ERROR: no such table: payment_submissions',
    'table properties has no column named late_fee_amount',
  ]) {
    it(`maps a stale-schema error to 503 + a migration hint (${message.slice(
      0,
      24
    )}…)`, async () => {
      expect(isSchemaStaleError(new Error(message))).toBe(true);

      const response = responseFromError(new Error(message));

      expect(response.status).toBe(503);

      const body = (await response.json()) as { error: string; code?: string };

      expect(body.code).toBe(SCHEMA_STALE_CODE);
      expect(body.error).toContain('migrate:local');
    });
  }

  it('does not treat a non-schema error as stale, even when it mentions a column', () => {
    expect(isSchemaStaleError(new Error('Invalid column selection in the report builder'))).toBe(
      false
    );
    expect(isSchemaStaleError('no such table: whatever')).toBe(false);
    expect(responseFromError(new Error('Invalid column selection')).status).toBe(500);
  });

  it('lets an HttpError keep its own status even when its message looks stale', async () => {
    const response = responseFromError(
      new HttpError(400, 'Bad request: no such column', { code: 'validation_error' })
    );

    expect(response.status).toBe(400);
    expect((await response.json()) as { code?: string }).toMatchObject({
      code: 'validation_error',
    });
  });
});
