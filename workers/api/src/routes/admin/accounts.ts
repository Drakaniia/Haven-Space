import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { readJsonObject } from '../../lib/validation';
import {
  getAdminSummary,
  insertAdminAuditLog,
  listAdminAuditLog,
  listAdminUsers,
  updateAdminUserStatus,
} from '../../repositories/admin-dashboard';
import { revokeAllForLandlord } from '../../repositories/property-access';
import { requireAdmin } from './shared';

async function handleAdminAuditLog(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const { data, meta } = await listAdminAuditLog(db, {
    limit: c.req.query('limit'),
    offset: c.req.query('offset'),
  });

  return jsonResponse({ data, meta });
}

async function handleAdminSummary(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  return jsonResponse({ data: await getAdminSummary(db) });
}

async function handleAdminUsers(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const result = await listAdminUsers(db, {
    limit: c.req.query('limit'),
    offset: c.req.query('offset'),
    query: c.req.query('q'),
    role: c.req.query('role'),
  });

  return jsonResponse(result);
}

async function handleUpdateAdminUser(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);
  const accountStatus = String(body.account_status ?? body.status ?? '');

  if (!accountStatus || !['active', 'suspended', 'banned'].includes(accountStatus)) {
    return errorResponse(400, 'Invalid account status. Allowed: active, suspended, banned');
  }

  let rawIds: unknown = body.userIds ?? body.ids ?? body.userId ?? null;
  let ids: number[] = [];
  if (Array.isArray(rawIds)) {
    ids = rawIds.map(v => Number.parseInt(String(v), 10)).filter(n => Number.isFinite(n) && n > 0);
  } else if (rawIds != null) {
    const single = Number.parseInt(String(rawIds), 10);
    if (Number.isFinite(single) && single > 0) ids = [single];
  }

  if (ids.length === 0) {
    return errorResponse(400, 'Missing required fields: userId or userIds, account_status');
  }

  if (ids.length > 100) {
    return errorResponse(413, 'Too many targets. Max 100 per bulk operation.');
  }

  ids = [...new Set(ids)];
  const actorVal = user as unknown as { user_id: number; id?: number };
  const actorId = actorVal.user_id ?? actorVal.id ?? 0;
  const beforeCount = ids.length;
  ids = ids.filter(id => id !== actorId);
  const skippedSelf = beforeCount !== ids.length;

  if (ids.length === 0) {
    return errorResponse(400, 'Cannot modify your own account via bulk operation.');
  }

  const updated: number[] = [];
  const failed: Array<{ id: number; reason: string }> = [];

  for (const targetId of ids) {
    try {
      const changes = await updateAdminUserStatus(db, targetId, accountStatus);
      if (changes === 0) {
        failed.push({ id: targetId, reason: 'User not found' });
      } else {
        updated.push(targetId);
        if (accountStatus === 'suspended' || accountStatus === 'banned') {
          await revokeAllForLandlord(db, targetId, actorId);
        }
      }
    } catch (err) {
      failed.push({ id: targetId, reason: err instanceof Error ? err.message : 'Update failed' });
    }
  }

  if (updated.length > 0) {
    await insertAdminAuditLog(db, actorId, 'users', updated, accountStatus);
  }

  if (ids.length === 1 && updated.length === 0 && failed.length === 1) {
    return errorResponse(404, 'User not found');
  }

  const message =
    failed.length === 0
      ? skippedSelf
        ? `User status updated successfully (${updated.length} updated, skipped your own account)`
        : `User status updated successfully`
      : `Updated ${updated.length}, ${failed.length} failed${
          skippedSelf ? ' (skipped your own account)' : ''
        }`;

  return jsonResponse({
    message,
    data: { updated, failed, skippedSelf },
  });
}

export function registerAccountRoutes(router: Hono<{ Bindings: Env }>) {
  router.get('/api/admin/summary', handleAdminSummary);
  router.get('/api/admin/audit-log', handleAdminAuditLog);
  router.get('/api/admin/users', handleAdminUsers);
  router.patch('/api/admin/users', handleUpdateAdminUser);
}
