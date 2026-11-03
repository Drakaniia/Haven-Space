import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { readJsonObject } from '../../lib/validation';
import {
  insertAdminAuditLog,
  listAdminProperties,
  updateAdminPropertyModeration,
} from '../../repositories/admin-dashboard';
import {
  listLandlordManagedRooms,
  listLandlordRoomPhotos,
} from '../../repositories/landlord-rooms';
import { requireAdmin } from './shared';

async function handleAdminProperties(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const moderation = c.req.query('moderation') || 'pending_review';
  const moderationStatus = moderation === 'all' ? null : moderation;

  return jsonResponse({ data: await listAdminProperties(db, moderationStatus) });
}

/**
 * Read-only per-room view for a property (spec `create-listing-room-details`
 * R10): capacity, live occupancy and status, so an admin inspecting a property
 * sees exactly what boarders see.
 */
async function handleAdminPropertyRooms(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const propertyId = Number.parseInt(c.req.query('id') ?? '', 10);

  if (!Number.isFinite(propertyId)) {
    return errorResponse(400, 'Property ID is required');
  }

  // Rooms are property-scoped, so the landlord id is irrelevant here.
  const rooms = await listLandlordManagedRooms(db, propertyId, user.user_id);
  const photos = await listLandlordRoomPhotos(
    db,
    rooms.map(room => Number(room.id))
  );

  return jsonResponse({
    data: rooms.map(room => {
      const capacity = Math.max(Number(room.capacity ?? 1), 1);
      const occupied = Math.max(Number(room.occupied ?? 0), 0);

      return {
        id: Number(room.id),
        room_number: room.room_number ?? '',
        room_type: room.room_type ?? null,
        price: Number(room.price),
        capacity,
        occupied,
        free_slots: Math.max(capacity - occupied, 0),
        status: room.status ?? 'available',
        photo_count: (photos.get(Number(room.id)) ?? []).length,
      };
    }),
  });
}

async function handleUpdateAdminProperty(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);
  const action = String(body.action ?? '');
  const newStatus =
    action === 'publish'
      ? 'published'
      : action === 'reject'
      ? 'rejected'
      : action === 'flag'
      ? 'flagged'
      : '';

  if (!action || !newStatus) {
    return errorResponse(400, 'Invalid action. Use publish, reject, or flag');
  }

  let rawIds: unknown = body.propertyIds ?? body.ids ?? body.propertyId ?? null;
  let ids: number[] = [];
  if (Array.isArray(rawIds)) {
    ids = rawIds.map(v => Number.parseInt(String(v), 10)).filter(n => Number.isFinite(n) && n > 0);
  } else if (rawIds != null) {
    const single = Number.parseInt(String(rawIds), 10);
    if (Number.isFinite(single) && single > 0) ids = [single];
  }

  if (ids.length === 0) {
    return errorResponse(400, 'Missing required fields: propertyId or propertyIds, action');
  }

  if (ids.length > 100) {
    return errorResponse(413, 'Too many targets. Max 100 per bulk operation.');
  }

  ids = [...new Set(ids)];

  const updated: number[] = [];
  const failed: Array<{ id: number; reason: string }> = [];

  for (const targetId of ids) {
    try {
      const changes = await updateAdminPropertyModeration(db, targetId, newStatus);
      if (changes === 0) failed.push({ id: targetId, reason: 'Property not found' });
      else updated.push(targetId);
    } catch (err) {
      failed.push({ id: targetId, reason: err instanceof Error ? err.message : 'Update failed' });
    }
  }

  if (updated.length > 0) {
    const actorVal = user as unknown as { user_id: number; id?: number };
    const actorId = actorVal.user_id ?? actorVal.id ?? 0;
    await insertAdminAuditLog(db, actorId, 'properties', updated, action);
  }

  if (ids.length === 1 && updated.length === 0 && failed.length === 1) {
    return errorResponse(404, 'Property not found');
  }

  const message =
    failed.length === 0
      ? 'Property moderation status updated successfully'
      : `Updated ${updated.length}, ${failed.length} failed`;

  return jsonResponse({ message, data: { updated, failed } });
}

export function registerPropertyAdminRoutes(router: Hono<{ Bindings: Env }>) {
  router.get('/api/admin/properties', handleAdminProperties);
  router.get('/api/admin/properties/rooms', handleAdminPropertyRooms);
  router.post('/api/admin/properties', handleUpdateAdminProperty);
}
