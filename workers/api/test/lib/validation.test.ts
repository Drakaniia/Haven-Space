import { describe, expect, it } from 'bun:test';

import { HttpError } from '../../src/lib/http';
import { readJsonObject } from '../../src/lib/validation';

describe('validation helpers', () => {
  it('reads JSON object request bodies', async () => {
    const request = new Request('http://localhost/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'boarder@example.com' }),
    });

    await expect(readJsonObject(request)).resolves.toEqual({ email: 'boarder@example.com' });
  });

  it('rejects non-JSON bodies', async () => {
    const request = new Request('http://localhost/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'email=boarder@example.com',
    });

    await expect(readJsonObject(request)).rejects.toThrow(HttpError);
    await expect(readJsonObject(request.clone())).rejects.toThrow(
      'Expected application/json request body'
    );
  });
});
