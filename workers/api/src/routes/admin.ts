import { Hono, type Context } from 'hono';

import type { Env } from '../env';
import { authenticateUser } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import { readJsonObject, type JsonRecord } from '../lib/validation';
import {
  allowedAdminSettingKeys,
  getAdminApplications,
  getAdminSettings,
  getAdminSummary,
  listAdminProperties,
  listAdminUsers,
  updateAdminPropertyModeration,
  updateAdminUserStatus,
  upsertAdminSetting,
} from '../repositories/admin-dashboard';
import {
  getAdminLandlordDetail,
  listAdminLandlords,
  updateLandlordVerification,
} from '../repositories/admin-landlords';
import {
  countLandlordCreatedData,
  createPropertyInvitation,
  createPropertyInvitationNotification,
  createPropertyAccessRemovedNotification,
  deleteInvitationNotifications,
  findActiveAccess,
  findInviteeLandlord,
  findPendingInvitation,
  findPropertyForAccess,
  findPropertyInvitation,
  listAuthorizedLandlords,
  listPendingInvitationsForProperty,
  listPropertyAccessHistory,
  listPropertyAccessOverview,
  removePropertyAccess,
  revokeAllForLandlord,
  revokePropertyInvitation,
} from '../repositories/property-access';
import { findUserAccountById } from '../repositories/users';

const adminRoutes = new Hono<{ Bindings: Env }>();

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function requireAdmin(c: Context<{ Bindings: Env }>) {
  const user = await authenticateUser(requireD1(c.env), c.req.raw, c.env.JWT_SECRET);

  if (user.role !== 'admin') {
    return null;
  }

  return user;
}

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

async function handleUpdateAdminLandlord(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);
  const landlordId = Number.parseInt(String(body.landlordId ?? ''), 10);
  const action = String(body.action ?? '');

  if (!Number.isFinite(landlordId) || landlordId <= 0 || !action) {
    return errorResponse(400, 'Missing required fields: landlordId, action');
  }

  if (action !== 'approve' && action !== 'reject') {
    return errorResponse(400, 'Invalid action. Use approve or reject');
  }

  const changes = await updateLandlordVerification(db, landlordId, action);

  if (changes === 0) {
    return errorResponse(404, 'Landlord not found');
  }

  return jsonResponse({ message: 'Landlord verification updated successfully' });
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
  const userId = Number.parseInt(String(body.userId ?? ''), 10);
  const accountStatus = String(body.account_status ?? '');

  if (!Number.isFinite(userId) || userId <= 0 || !accountStatus) {
    return errorResponse(400, 'Missing required fields: userId, account_status');
  }

  if (!['active', 'suspended', 'banned'].includes(accountStatus)) {
    return errorResponse(400, 'Invalid account status. Allowed: active, suspended, banned');
  }

  const changes = await updateAdminUserStatus(db, userId, accountStatus);

  if (changes === 0) {
    return errorResponse(404, 'User not found');
  }

  if (accountStatus === 'suspended' || accountStatus === 'banned') {
    await revokeAllForLandlord(db, userId, user.user_id);
  }

  return jsonResponse({ message: 'User status updated successfully' });
}

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

async function handleUpdateAdminProperty(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);
  const propertyId = Number.parseInt(String(body.propertyId ?? ''), 10);
  const action = String(body.action ?? '');
  const newStatus =
    action === 'publish'
      ? 'published'
      : action === 'reject'
      ? 'rejected'
      : action === 'flag'
      ? 'flagged'
      : '';

  if (!Number.isFinite(propertyId) || propertyId <= 0 || !action) {
    return errorResponse(400, 'Missing required fields: propertyId, action');
  }

  if (!newStatus) {
    return errorResponse(400, 'Invalid action. Use publish, reject, or flag');
  }

  const changes = await updateAdminPropertyModeration(db, propertyId, newStatus);

  if (changes === 0) {
    return errorResponse(404, 'Property not found');
  }

  return jsonResponse({ message: 'Property moderation status updated successfully' });
}

async function handleAdminApplications(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  return jsonResponse({ data: await getAdminApplications(db) });
}

async function handleAdminSettings(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  return jsonResponse({ data: await getAdminSettings(db) });
}

async function handleUpdateAdminSettings(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);

  if (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) {
    return errorResponse(400, 'Missing or invalid settings object');
  }

  for (const [key, value] of Object.entries(body.settings)) {
    if (!allowedAdminSettingKeys.includes(key)) {
      continue;
    }

    await upsertAdminSetting(db, key, String(value ?? ''));
  }

  return jsonResponse({ message: 'Settings updated successfully' });
}

function parseBodyPositiveInt(body: JsonRecord, field: string): number | null {
  const parsed = Number.parseInt(String(body[field] ?? ''), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatUserName(first: string | null | undefined, last: string | null | undefined): string {
  return [first, last].filter(Boolean).join(' ').trim() || 'Haven Space Admin';
}

async function handleAdminPropertyAccess(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const propertyIdFilter = parsePositiveInt(c.req.query('propertyId'));
  const overview = await listPropertyAccessOverview(db);
  const properties = [];

  for (const row of overview) {
    if (propertyIdFilter && Number(row.property_id) !== propertyIdFilter) {
      continue;
    }

    const [authorizedLandlords, pendingInvitations] = await Promise.all([
      listAuthorizedLandlords(db, Number(row.property_id)),
      listPendingInvitationsForProperty(db, Number(row.property_id)),
    ]);

    properties.push({
      id: Number(row.property_id),
      title: row.property_title,
      owner: {
        id: Number(row.owner_id),
        name: formatUserName(row.owner_first_name, row.owner_last_name),
        email: row.owner_email,
      },
      authorized_landlords: authorizedLandlords.map(landlord => ({
        id: Number(landlord.landlord_id),
        first_name: landlord.first_name,
        last_name: landlord.last_name,
        email: landlord.email,
        granted_by: Number(landlord.granted_by),
        granted_at: landlord.granted_at,
      })),
      pending_invitations: pendingInvitations.map(invitation => ({
        id: Number(invitation.id),
        invitee_id: Number(invitation.invitee_id),
        invitee_name: formatUserName(invitation.invitee_first_name, invitation.invitee_last_name),
        invitee_email: invitation.invitee_email,
        invited_by: Number(invitation.invited_by),
        created_at: invitation.created_at,
      })),
    });
  }

  return jsonResponse({ data: { properties } });
}

async function handleCreatePropertyAccessInvitation(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);
  const landlordId = parseBodyPositiveInt(body, 'landlordId');
  const propertyId = parseBodyPositiveInt(body, 'propertyId');

  if (!landlordId || !propertyId) {
    return errorResponse(400, 'Missing required fields: landlordId, propertyId');
  }

  const property = await findPropertyForAccess(db, propertyId);

  if (!property) {
    return errorResponse(404, 'Property not found');
  }

  if (Number(property.landlord_id) === landlordId) {
    return errorResponse(400, 'This landlord already owns this property.');
  }

  const invitee = await findInviteeLandlord(db, landlordId);

  if (!invitee) {
    return errorResponse(404, 'Landlord not found');
  }

  if (!invitee.is_verified || invitee.account_status !== 'active') {
    return errorResponse(400, 'Landlord must be verified and active to receive property access.');
  }

  const existingAccess = await findActiveAccess(db, propertyId, landlordId);

  if (existingAccess) {
    return errorResponse(409, 'This landlord already has access to this property.');
  }

  const existingPending = await findPendingInvitation(db, propertyId, landlordId);

  if (existingPending) {
    return errorResponse(409, 'This landlord already has a pending invitation to this property.');
  }

  const invitationId = await createPropertyInvitation(db, {
    propertyId,
    inviteeId: landlordId,
    invitedBy: user.user_id,
  });
  const admin = await findUserAccountById(db, user.user_id);
  const adminName = formatUserName(admin?.first_name, admin?.last_name);

  await createPropertyInvitationNotification(db, {
    inviteeId: landlordId,
    invitationId,
    propertyId,
    propertyName: property.title,
    invitedByName: adminName,
  });

  const invitation = await findPropertyInvitation(db, invitationId);

  return jsonResponse(
    {
      message: 'Invitation sent',
      data: {
        invitation: {
          id: invitationId,
          property_id: propertyId,
          property_name: property.title,
          invitee_id: landlordId,
          invitee_name: formatUserName(invitee.first_name, invitee.last_name),
          invited_by: user.user_id,
          status: invitation?.status ?? 'pending',
          created_at: invitation?.created_at,
        },
      },
    },
    201
  );
}

async function handleRevokePropertyAccessInvitation(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const invitationId = parsePositiveInt(c.req.param('id'));

  if (!invitationId) {
    return errorResponse(400, 'Invalid invitation ID');
  }

  const invitation = await findPropertyInvitation(db, invitationId);

  if (!invitation) {
    return errorResponse(404, 'Invitation not found');
  }

  if (invitation.status !== 'pending') {
    return errorResponse(409, 'Only pending invitations can be revoked.');
  }

  const changes = await revokePropertyInvitation(db, invitationId, user.user_id);

  if (changes === 0) {
    return errorResponse(409, 'Only pending invitations can be revoked.');
  }

  await deleteInvitationNotifications(db, invitation.invitee_id, invitationId);

  return jsonResponse({ message: 'Invitation revoked' });
}

async function handleRemovePropertyAccess(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);
  const propertyId = parseBodyPositiveInt(body, 'propertyId');
  const landlordId = parseBodyPositiveInt(body, 'landlordId');

  if (!propertyId || !landlordId) {
    return errorResponse(400, 'Missing required fields: propertyId, landlordId');
  }

  const access = await findActiveAccess(db, propertyId, landlordId);

  if (!access) {
    return errorResponse(409, 'This landlord does not have active access to this property.');
  }

  const changes = await removePropertyAccess(db, propertyId, landlordId, user.user_id);

  if (changes === 0) {
    return errorResponse(409, 'This landlord does not have active access to this property.');
  }

  const property = await findPropertyForAccess(db, propertyId);

  await createPropertyAccessRemovedNotification(db, {
    landlordId,
    propertyId,
    propertyName: property?.title ?? 'property',
  });

  return jsonResponse({
    message: 'Access removed',
    data: {
      property_id: propertyId,
      landlord_id: landlordId,
    },
  });
}

async function handlePropertyAccessLandlordData(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const propertyId = parsePositiveInt(c.req.param('propertyId'));
  const landlordId = parsePositiveInt(c.req.query('landlordId'));

  if (!propertyId || !landlordId) {
    return errorResponse(400, 'propertyId and landlordId are required');
  }

  const property = await findPropertyForAccess(db, propertyId);
  const landlord = await findInviteeLandlord(db, landlordId);

  if (!property || !landlord) {
    return errorResponse(404, 'Property or landlord not found');
  }

  const counts = await countLandlordCreatedData(db, propertyId, landlordId);

  return jsonResponse({
    data: {
      landlord_id: landlordId,
      landlord_name: formatUserName(landlord.first_name, landlord.last_name),
      property_id: propertyId,
      property_name: property.title,
      created: counts,
    },
  });
}

async function handlePropertyAccessHistory(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const propertyId = parsePositiveInt(c.req.query('propertyId'));
  const landlordId = parsePositiveInt(c.req.query('landlordId'));
  const events = await listPropertyAccessHistory(db, {
    propertyId: propertyId ?? undefined,
    landlordId: landlordId ?? undefined,
  });
  const nameCache = new Map<number, string>();
  const propertyCache = new Map<number, string>();

  async function userName(userId: number): Promise<string> {
    if (!nameCache.has(userId)) {
      const account = await findUserAccountById(db, userId);
      nameCache.set(
        userId,
        account ? formatUserName(account.first_name, account.last_name) : `User #${userId}`
      );
    }

    return nameCache.get(userId) ?? '';
  }

  async function propertyName(propertyIdValue: number): Promise<string> {
    if (!propertyCache.has(propertyIdValue)) {
      const property = await findPropertyForAccess(db, propertyIdValue);
      propertyCache.set(propertyIdValue, property?.title ?? `Property #${propertyIdValue}`);
    }

    return propertyCache.get(propertyIdValue) ?? '';
  }

  const formattedEvents = [];

  for (const event of events) {
    formattedEvents.push({
      type: event.type,
      invitation_id: event.invitation_id,
      access_id: event.access_id,
      property_id: event.property_id,
      property_name: await propertyName(event.property_id),
      landlord_id: event.landlord_id,
      landlord_name: await userName(event.landlord_id),
      actor_id: event.actor_id,
      actor_name: event.actor_id === null ? null : await userName(event.actor_id),
      at: event.at,
    });
  }

  return jsonResponse({ data: { events: formattedEvents } });
}

adminRoutes.get('/api/admin/property-access', handleAdminPropertyAccess);
adminRoutes.post('/api/admin/property-access/invitations', handleCreatePropertyAccessInvitation);
adminRoutes.post(
  '/api/admin/property-access/invitations/:id/revoke',
  handleRevokePropertyAccessInvitation
);
adminRoutes.post('/api/admin/property-access/remove', handleRemovePropertyAccess);
adminRoutes.get('/api/admin/property-access/history', handlePropertyAccessHistory);
adminRoutes.get(
  '/api/admin/property-access/:propertyId/landlord-data',
  handlePropertyAccessLandlordData
);
adminRoutes.get('/api/admin/landlords', handleAdminLandlords);
adminRoutes.post('/api/admin/landlords', handleUpdateAdminLandlord);
adminRoutes.get('/api/admin/summary', handleAdminSummary);
adminRoutes.get('/api/admin/users', handleAdminUsers);
adminRoutes.patch('/api/admin/users', handleUpdateAdminUser);
adminRoutes.get('/api/admin/properties', handleAdminProperties);
adminRoutes.post('/api/admin/properties', handleUpdateAdminProperty);
adminRoutes.get('/api/admin/applications', handleAdminApplications);
adminRoutes.get('/api/admin/settings', handleAdminSettings);
adminRoutes.patch('/api/admin/settings', handleUpdateAdminSettings);

export default adminRoutes;
