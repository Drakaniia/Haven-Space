import type { D1Database, D1Result } from '@cloudflare/workers-types';
import type {
  PropertyInvitationRow,
  PendingInvitationRow,
  InvitationListItemRow,
  CreatePropertyInvitationInput,
  PropertyForAccessRow,
  InviteeLandlordRow,
} from './types.js';
import { insertedId, firstWhere } from './helpers.js';

export async function createPropertyInvitation(
  db: D1Database,
  input: CreatePropertyInvitationInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO property_invitations (property_id, invitee_id, invited_by, status)
        VALUES (?, ?, ?, 'pending')
      `
    )
    .bind(input.propertyId, input.inviteeId, input.invitedBy)
    .run();

  return insertedId(result, 'Property invitation');
}


export async function findPropertyInvitation(
  db: D1Database,
  invitationId: number
): Promise<PropertyInvitationRow | null> {
  return await firstWhere<PropertyInvitationRow>(
    db,
    `
      SELECT *
      FROM property_invitations
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [invitationId],
    'Property invitation'
  );
}


export async function findPendingInvitation(
  db: D1Database,
  propertyId: number,
  inviteeId: number
): Promise<PropertyInvitationRow | null> {
  return await firstWhere<PropertyInvitationRow>(
    db,
    `
      SELECT *
      FROM property_invitations
      WHERE property_id = ?
        AND invitee_id = ?
        AND status = 'pending'
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [propertyId, inviteeId],
    'Property invitation'
  );
}


export async function listInvitationsForInvitee(
  db: D1Database,
  inviteeId: number
): Promise<InvitationListItemRow[]> {
  const result = await db
    .prepare(
      `
        SELECT
          pi.id,
          pi.property_id,
          pi.status,
          pi.accepted_at,
          pi.rejected_at,
          pi.revoked_at,
          pi.created_at,
          p.title AS property_name,
          ou.first_name AS owner_first_name,
          ou.last_name AS owner_last_name,
          ou.email AS owner_email
        FROM property_invitations pi
        JOIN properties p ON pi.property_id = p.id
          AND p.deleted_at IS NULL
        JOIN users ou ON p.landlord_id = ou.id
        WHERE pi.invitee_id = ?
          AND pi.deleted_at IS NULL
        ORDER BY pi.created_at DESC
      `
    )
    .bind(inviteeId)
    .all<InvitationListItemRow>();

  return result.results ?? [];
}


export async function listPendingInvitationsForProperty(
  db: D1Database,
  propertyId: number
): Promise<PendingInvitationRow[]> {
  const result = await db
    .prepare(
      `
        SELECT
          pi.id,
          pi.invitee_id,
          pi.invited_by,
          pi.created_at,
          u.first_name AS invitee_first_name,
          u.last_name AS invitee_last_name,
          u.email AS invitee_email
        FROM property_invitations pi
        JOIN users u ON pi.invitee_id = u.id
        WHERE pi.property_id = ?
          AND pi.status = 'pending'
          AND pi.deleted_at IS NULL
        ORDER BY pi.created_at DESC
      `
    )
    .bind(propertyId)
    .all<PendingInvitationRow>();

  return result.results ?? [];
}


export async function acceptPropertyInvitation(
  db: D1Database,
  input: { invitationId: number; grantedBy: number }
): Promise<number> {
  const invitation = await findPropertyInvitation(db, input.invitationId);

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  // Run the status update and the access grant in a single D1 transaction so a
  // failed insert (e.g. a unique-constraint race) rolls back the "accepted"
  // update instead of leaving an accepted invitation with no active access.
  const [updateResult, insertResult] = await db.batch([
    db
      .prepare(
        `
          UPDATE property_invitations
          SET status = 'accepted',
              accepted_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
            AND status = 'pending'
            AND deleted_at IS NULL
        `
      )
      .bind(input.invitationId),
    db
      .prepare(
        `
          INSERT INTO property_access (
            property_id,
            landlord_id,
            granted_by,
            invitation_id
          )
          VALUES (?, ?, ?, ?)
        `
      )
      .bind(invitation.property_id, invitation.invitee_id, input.grantedBy, input.invitationId),
  ]);

  if (Number(updateResult.meta.changes ?? 0) === 0) {
    throw new Error('Invitation is not pending');
  }

  return insertedId(insertResult, 'Property access');
}


export async function rejectPropertyInvitation(
  db: D1Database,
  invitationId: number
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE property_invitations
        SET status = 'rejected',
            rejected_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND status = 'pending'
          AND deleted_at IS NULL
      `
    )
    .bind(invitationId)
    .run();

  return Number(result.meta.changes ?? 0);
}


export async function revokePropertyInvitation(
  db: D1Database,
  invitationId: number,
  revokedBy: number
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE property_invitations
        SET status = 'revoked',
            revoked_at = CURRENT_TIMESTAMP,
            revoked_by = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND status = 'pending'
          AND deleted_at IS NULL
      `
    )
    .bind(revokedBy, invitationId)
    .run();

  return Number(result.meta.changes ?? 0);
}

