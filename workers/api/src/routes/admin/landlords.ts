import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { readJsonObject } from '../../lib/validation';
import { insertAdminAuditLog } from '../../repositories/admin-dashboard';
import {
  getAdminLandlordDetail,
  listAdminLandlords,
  updateLandlordVerification,
} from '../../repositories/admin-landlords';
import {
  createLandlordVerificationNotification,
  setVerificationNote,
  setVerificationStatus,
} from '../../repositories/landlord-verification';
import { formatUserName, parsePositiveInt, requireAdmin } from './shared';

async function handleAdminLandlords(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const detailId = parsePositiveInt(c.req.query('id'));

  if (detailId) {
    const landlord = await getAdminLandlordDetail(db, detailId);

    if (!landlord) {
      return errorResponse(404, 'Landlord not found');
    }

    return jsonResponse({ data: landlord });
  }

  if (parsePositiveInt(c.req.query('history'))) {
    return jsonResponse({ data: [] });
  }

  const landlords = await listAdminLandlords(
    db,
    c.req.query('status') ?? '',
    c.req.query('limit'),
    c.req.query('offset')
  );

  return jsonResponse({ data: landlords });
}

const landlordVerificationActions = ['approve', 'reject', 'request_documents'] as const;

type LandlordVerificationAction = (typeof landlordVerificationActions)[number];

function isLandlordVerificationAction(value: string): value is LandlordVerificationAction {
  return (landlordVerificationActions as readonly string[]).includes(value);
}

/**
 * Applies an admin decision to a landlord's verification bundle.
 *
 * `approve` is gated on all four documents being on file — the modal disables the
 * button for the same reason, and this endpoint is the enforcement point. `reject`
 * records an optional reason the landlord sees. `request_documents` nudges the
 * landlord without changing the bundle status.
 */
async function handleUpdateAdminLandlord(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);
  const landlordId = Number.parseInt(String(body.landlordId ?? ''), 10);
  const action = String(body.action ?? '');
  const reason = String(body.reason ?? '').trim() || null;

  if (!Number.isFinite(landlordId) || landlordId <= 0 || !action) {
    return errorResponse(400, 'Missing required fields: landlordId, action');
  }

  if (!isLandlordVerificationAction(action)) {
    return errorResponse(400, 'Invalid action. Use approve, reject or request_documents');
  }

  const landlord = await getAdminLandlordDetail(db, landlordId);

  if (!landlord) {
    return errorResponse(404, 'Landlord not found');
  }

  if (action === 'approve' && !landlord.documents_complete) {
    return errorResponse(409, 'All four verification documents are required before approval');
  }

  const actorVal = user as unknown as { user_id: number; id?: number };
  const actorId = actorVal.user_id ?? actorVal.id ?? 0;

  if (action === 'request_documents') {
    await setVerificationNote(db, landlordId, reason);
    await createLandlordVerificationNotification(db, {
      landlordId,
      landlordName: formatUserName(landlord.first_name, landlord.last_name),
      decision: 'request_documents',
      reason,
    });
    await insertAdminAuditLog(db, actorId, 'landlord_verification', [landlordId], action);

    return jsonResponse({ message: 'Verification documents requested' });
  }

  const changes = await updateLandlordVerification(db, landlordId, action);

  if (changes === 0) {
    return errorResponse(404, 'Landlord not found');
  }

  await setVerificationStatus(db, landlordId, {
    status: action === 'approve' ? 'approved' : 'rejected',
    note: reason,
    reviewedBy: actorId,
  });
  await createLandlordVerificationNotification(db, {
    landlordId,
    landlordName: formatUserName(landlord.first_name, landlord.last_name),
    decision: action === 'approve' ? 'approved' : 'rejected',
    reason,
  });
  await insertAdminAuditLog(db, actorId, 'landlord_verification', [landlordId], action);

  return jsonResponse({ message: 'Landlord verification updated successfully' });
}

export function registerLandlordRoutes(router: Hono<{ Bindings: Env }>) {
  router.get('/api/admin/landlords', handleAdminLandlords);
  router.post('/api/admin/landlords', handleUpdateAdminLandlord);
}
