import type { Context } from 'hono';

import type { Env } from '../../env';
import { authenticateUser, type AuthenticatedUser } from '../../lib/auth';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { isJsonRecord, type JsonRecord } from '../../lib/validation';
import { findApplicationById, type ApplicationDetailRow } from '../../repositories/applications';
import { findActiveAccess } from '../../repositories/property-access';

// Landlords may only move an application forward to accepted or rejected; every
// other transition (confirm, withdraw, end) is driven by a different endpoint
// and validated against the state machine.
export const validApplicationStatuses = new Set(['accepted', 'rejected']);

export function parseRouteId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function readApplicationJson(request: Request): Promise<JsonRecord | null> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!isJsonRecord(body) || Object.keys(body).length === 0) {
    return null;
  }

  return body;
}

export function requiredPositiveInt(body: JsonRecord, field: string): number | null {
  const value = body[field];

  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function requiredNonEmptyString(body: JsonRecord, field: string): string | null {
  const value = body[field];

  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
}

// A landlord can view/manage an application when they are the application's
// landlord or they hold active shared access to the application's property.
export async function canAccessApplication(
  db: D1Database,
  application: ApplicationDetailRow,
  user: AuthenticatedUser
): Promise<boolean> {
  if (user.role === 'boarder') {
    return Number(application.boarder_id) === user.user_id;
  }

  if (user.role === 'landlord') {
    if (Number(application.landlord_id) === user.user_id) {
      return true;
    }

    const access = await findActiveAccess(db, Number(application.property_id), user.user_id);
    return access !== null;
  }

  return false;
}

export async function showApplication(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await authenticateUser(db, c.req.raw, c.env.JWT_SECRET);
  const applicationId = parseRouteId(c.req.param('id'));

  if (!applicationId) {
    return errorResponse(404, 'Application not found');
  }

  const application = await findApplicationById(db, applicationId);

  if (!application || !(await canAccessApplication(db, application, user))) {
    return errorResponse(404, 'Application not found');
  }

  return jsonResponse({ data: application });
}
