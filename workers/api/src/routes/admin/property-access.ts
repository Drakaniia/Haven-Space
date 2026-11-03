import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { readJsonObject } from '../../lib/validation';
import {
  countLandlordCreatedData,
  createPropertyAccessRemovedNotification,
  createPropertyInvitation,
  createPropertyInvitationNotification,
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
  revokePropertyInvitation,
} from '../../repositories/property-access';
import { findUserAccountById } from '../../repositories/users';
import { formatUserName, parseBodyPositiveInt, parsePositiveInt, requireAdmin } from './shared';

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

export function registerPropertyAccessRoutes(router: Hono<{ Bindings: Env }>) {
  router.get('/api/admin/property-access', handleAdminPropertyAccess);
  router.post('/api/admin/property-access/invitations', handleCreatePropertyAccessInvitation);
  router.post(
    '/api/admin/property-access/invitations/:id/revoke',
    handleRevokePropertyAccessInvitation
  );
  router.post('/api/admin/property-access/remove', handleRemovePropertyAccess);
  router.get('/api/admin/property-access/history', handlePropertyAccessHistory);
  router.get(
    '/api/admin/property-access/:propertyId/landlord-data',
    handlePropertyAccessLandlordData
  );
}
