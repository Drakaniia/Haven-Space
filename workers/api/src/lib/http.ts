export interface ErrorBody {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Code + message for the "the database is behind the code" case.
 *
 * A stale D1 database (a migration that was written but never applied) used to
 * surface as a bare `Internal server error`, which reads like a server bug and
 * sends the reader looking in the wrong place. It is an environment fault, so it
 * gets 503 + a message that names the fix (spec `payments-shell-reverification`
 * D6).
 */
export const SCHEMA_STALE_CODE = 'database_schema_stale';
export const SCHEMA_STALE_MESSAGE =
  'The database is missing the latest migration. Apply it with ' +
  '`bun run --cwd workers/api migrate:local`, then try again.';

/*
  SQLite reports a schema mismatch as a plain `Error`, not a typed exception, so
  the detection has to be message-based. Kept deliberately narrow: these are the
  three phrasings SQLite/D1 use for "this column or table is not there", and a
  genuine query bug still falls through to the generic 500 (and its stack is
  still logged by `app.onError`).
*/
const SCHEMA_STALE_PATTERNS = [/no such column/i, /no such table/i, /has no column named/i];

/** True when an error is SQLite telling us the schema predates the query. */
export function isSchemaStaleError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return SCHEMA_STALE_PATTERNS.some(pattern => pattern.test(error.message));
}

export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function jsonResponse(body: unknown, init: ResponseInit | number = 200): Response {
  const responseInit = typeof init === 'number' ? { status: init } : init;
  const headers = new Headers(responseInit.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  }

  return new Response(JSON.stringify(body), {
    ...responseInit,
    headers,
  });
}

export function errorResponse(
  status: number,
  message: string,
  options: Omit<ErrorBody, 'error'> = {}
): Response {
  return jsonResponse(
    {
      error: message,
      ...options,
    },
    status
  );
}

export function responseFromError(error: unknown): Response {
  if (error instanceof HttpError) {
    return errorResponse(error.status, error.message, {
      code: error.code,
      details: error.details,
    });
  }

  if (isSchemaStaleError(error)) {
    return errorResponse(503, SCHEMA_STALE_MESSAGE, { code: SCHEMA_STALE_CODE });
  }

  return errorResponse(500, 'Internal server error');
}
