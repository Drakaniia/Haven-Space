import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import {
  acceptPropertyInvitation,
  deleteInvitationNotifications,
  findInviteeLandlord,
  findPropertyForAccess,
  findPropertyInvitation,
  listInvitationsForInvitee,
  rejectPropertyInvitation,
  type InvitationListItemRow,
} from '../../repositories/property-access';
import { parsePositiveInt, requireLandlord, requireVerifiedLandlordWrite } from './shared';

const invitationsRoutes = new Hono<{ Bindings: Env }>();

function formatInvitation(invitation: InvitationListItemRow) {
  const ownerName = [invitation.owner_first_name, invitation.owner_last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    id: Number(invitation.id),
    property_id: Number(invitation.property_id),
    property_name: invitation.property_name,
    owner_name: ownerName,
    owner_email: invitation.owner_email,
    status: invitation.status,
    created_at: invitation.created_at,
    accepted_at: invitation.accepted_at,
    rejected_at: invitation.rejected_at,
    revoked_at: invitation.revoked_at,
  };
}

async function handleListLandlordInvitations(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const invitations = await listInvitationsForInvitee(db, user.user_id);

  return jsonResponse({
    data: {
      invitations: invitations.map(formatInvitation),
    },
  });
}

async function handleAcceptLandlordInvitation(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const verificationError = requireVerifiedLandlordWrite(user);

  if (verificationError) {
    return verificationError;
  }

  const invitationId = parsePositiveInt(c.req.param('id'));

  if (!invitationId) {
    return errorResponse(400, 'Invalid invitation ID');
  }

  const invitation = await findPropertyInvitation(db, invitationId);

  if (!invitation || Number(invitation.invitee_id) !== user.user_id) {
    return errorResponse(404, 'Invitation not found');
  }

  if (invitation.status !== 'pending') {
    return errorResponse(409, 'This invitation can no longer be accepted.');
  }

  const property = await findPropertyForAccess(db, Number(invitation.property_id));

  if (!property) {
    return errorResponse(409, 'This property is no longer available.');
  }

  const invitee = await findInviteeLandlord(db, user.user_id);

  if (!invitee || !invitee.is_verified || invitee.account_status !== 'active') {
    return errorResponse(
      409,
      'Your account must be verified and active to accept property access.'
    );
  }

  await acceptPropertyInvitation(db, {
    invitationId,
    grantedBy: Number(invitation.invited_by),
  });
  await deleteInvitationNotifications(db, user.user_id, invitationId);

  return jsonResponse({
    message: 'Invitation accepted',
    data: {
      access: {
        property_id: Number(invitation.property_id),
        property_name: property.title,
        role: 'shared',
      },
    },
  });
}

async function handleRejectLandlordInvitation(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const verificationError = requireVerifiedLandlordWrite(user);

  if (verificationError) {
    return verificationError;
  }

  const invitationId = parsePositiveInt(c.req.param('id'));

  if (!invitationId) {
    return errorResponse(400, 'Invalid invitation ID');
  }

  const invitation = await findPropertyInvitation(db, invitationId);

  if (!invitation || Number(invitation.invitee_id) !== user.user_id) {
    return errorResponse(404, 'Invitation not found');
  }

  if (invitation.status !== 'pending') {
    return errorResponse(409, 'This invitation can no longer be rejected.');
  }

  const changes = await rejectPropertyInvitation(db, invitationId);

  if (changes === 0) {
    return errorResponse(409, 'This invitation can no longer be rejected.');
  }

  await deleteInvitationNotifications(db, user.user_id, invitationId);

  return jsonResponse({ message: 'Invitation rejected' });
}

invitationsRoutes.get('/invitations', handleListLandlordInvitations);
invitationsRoutes.post('/invitations/:id/accept', handleAcceptLandlordInvitation);
invitationsRoutes.post('/invitations/:id/reject', handleRejectLandlordInvitation);

export default invitationsRoutes;
