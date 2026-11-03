import type { Context } from 'hono';

import type { Env } from '../../env';
import { authenticateUser } from '../../lib/auth';
import { requireD1 } from '../../lib/d1';
import type { JsonRecord } from '../../lib/validation';

export function parsePositiveInt(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseBodyPositiveInt(body: JsonRecord, field: string): number | null {
  const parsed = Number.parseInt(String(body[field] ?? ''), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function formatUserName(
  first: string | null | undefined,
  last: string | null | undefined
): string {
  return [first, last].filter(Boolean).join(' ').trim() || 'Haven Space Admin';
}

export async function requireAdmin(c: Context<{ Bindings: Env }>) {
  const user = await authenticateUser(requireD1(c.env), c.req.raw, c.env.JWT_SECRET);

  if (user.role !== 'admin') {
    return null;
  }

  return user;
}
