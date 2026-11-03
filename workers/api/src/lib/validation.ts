import { HttpError } from './http';

export type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readJsonObject(request: Request): Promise<JsonRecord> {
  const contentType = request.headers.get('Content-Type')?.toLowerCase() ?? '';

  if (!contentType.includes('application/json')) {
    throw new HttpError(415, 'Expected application/json request body', {
      code: 'unsupported_media_type',
    });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, 'Invalid JSON request body', { code: 'invalid_json' });
  }

  if (!isJsonRecord(body)) {
    throw new HttpError(400, 'Expected JSON object request body', {
      code: 'invalid_json_body',
    });
  }

  return body;
}
