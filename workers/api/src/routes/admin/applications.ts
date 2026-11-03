import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { readJsonObject } from '../../lib/validation';
import {
  getAdminApplications,
  insertAdminAuditLog,
  updateAdminApplicationStatus,
} from '../../repositories/admin-dashboard';
import { requireAdmin } from './shared';

async function handleAdminApplications(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  return jsonResponse({ data: await getAdminApplications(db) });
}

async function handleUpdateAdminApplications(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);
  const rawAction = String(body.action ?? body.status ?? '');
  const normalizedAction =
    rawAction === 'approved' || rawAction === 'approve'
      ? 'approved'
      : rawAction === 'rejected' || rawAction === 'reject'
      ? 'rejected'
      : rawAction === 'pending'
      ? 'pending'
      : '';

  if (!normalizedAction) {
    return errorResponse(400, 'Invalid action. Use approve, reject, or pending');
  }

  let rawIds: unknown = body.applicationIds ?? body.ids ?? body.applicationId ?? body.id ?? null;
  let ids: number[] = [];
  if (Array.isArray(rawIds)) {
    ids = rawIds.map(v => Number.parseInt(String(v), 10)).filter(n => Number.isFinite(n) && n > 0);
  } else if (rawIds != null) {
    const single = Number.parseInt(String(rawIds), 10);
    if (Number.isFinite(single) && single > 0) ids = [single];
  }

  if (ids.length === 0) {
    return errorResponse(400, 'Missing required fields: applicationId or applicationIds, action');
  }

  if (ids.length > 100) {
    return errorResponse(413, 'Too many targets. Max 100 per bulk operation.');
  }

  ids = [...new Set(ids)];

  const updated: number[] = [];
  const failed: Array<{ id: number; reason: string }> = [];

  for (const targetId of ids) {
    try {
      const changes = await updateAdminApplicationStatus(db, targetId, normalizedAction);
      if (changes === 0) failed.push({ id: targetId, reason: 'Application not found' });
      else updated.push(targetId);
    } catch (err) {
      failed.push({ id: targetId, reason: err instanceof Error ? err.message : 'Update failed' });
    }
  }

  if (updated.length > 0) {
    const actorVal = user as unknown as { user_id: number; id?: number };
    const actorId = actorVal.user_id ?? actorVal.id ?? 0;
    await insertAdminAuditLog(db, actorId, 'applications', updated, normalizedAction);
  }

  if (ids.length === 1 && updated.length === 0 && failed.length === 1) {
    return errorResponse(404, 'Application not found');
  }

  const message =
    failed.length === 0
      ? 'Application status updated successfully'
      : `Updated ${updated.length}, ${failed.length} failed`;

  return jsonResponse({ message, data: { updated, failed } });
}

export function registerApplicationAdminRoutes(router: Hono<{ Bindings: Env }>) {
  router.get('/api/admin/applications', handleAdminApplications);
  router.patch('/api/admin/applications', handleUpdateAdminApplications);
}
