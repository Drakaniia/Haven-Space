import type { D1Database } from '@cloudflare/workers-types';
import type {
  AccessHistoryEventType,
  AccessHistoryEvent,
  PropertyInvitationRow,
  PropertyAccessRow,
} from './types.js';

export async function listPropertyAccessHistory(
  db: D1Database,
  input: { propertyId?: number; landlordId?: number }
): Promise<AccessHistoryEvent[]> {
  const invitationConditions = ['pi.deleted_at IS NULL'];
  const invitationBinds: unknown[] = [];

  if (input.propertyId) {
    invitationConditions.push('pi.property_id = ?');
    invitationBinds.push(input.propertyId);
  }

  if (input.landlordId) {
    invitationConditions.push('pi.invitee_id = ?');
    invitationBinds.push(input.landlordId);
  }

  const invitationRows = await db
    .prepare(
      `
        SELECT
          pi.id,
          pi.property_id,
          pi.invitee_id,
          pi.invited_by,
          pi.status,
          pi.accepted_at,
          pi.rejected_at,
          pi.revoked_at,
          pi.revoked_by,
          pi.created_at
        FROM property_invitations pi
        WHERE ${invitationConditions.join(' AND ')}
        ORDER BY pi.created_at ASC
      `
    )
    .bind(...invitationBinds)
    .all<PropertyInvitationRow>();

  const accessConditions: string[] = [];
  const accessBinds: unknown[] = [];

  if (input.propertyId) {
    accessConditions.push('pa.property_id = ?');
    accessBinds.push(input.propertyId);
  }

  if (input.landlordId) {
    accessConditions.push('pa.landlord_id = ?');
    accessBinds.push(input.landlordId);
  }

  const accessWhere = accessConditions.length > 0 ? `WHERE ${accessConditions.join(' AND ')}` : '';
  const accessRows = await db
    .prepare(
      `
        SELECT
          pa.id,
          pa.property_id,
          pa.landlord_id,
          pa.granted_by,
          pa.invitation_id,
          pa.granted_at,
          pa.removed_at,
          pa.removed_by
        FROM property_access pa
        ${accessWhere}
        ORDER BY pa.granted_at ASC
      `
    )
    .bind(...accessBinds)
    .all<PropertyAccessRow>();

  const events: AccessHistoryEvent[] = [];

  for (const row of invitationRows.results ?? []) {
    events.push({
      type: 'invitation_sent',
      invitation_id: Number(row.id),
      access_id: null,
      property_id: Number(row.property_id),
      landlord_id: Number(row.invitee_id),
      actor_id: Number(row.invited_by),
      at: row.created_at,
    });

    if (row.accepted_at) {
      events.push({
        type: 'invitation_accepted',
        invitation_id: Number(row.id),
        access_id: null,
        property_id: Number(row.property_id),
        landlord_id: Number(row.invitee_id),
        actor_id: Number(row.invitee_id),
        at: row.accepted_at,
      });
    }

    if (row.rejected_at) {
      events.push({
        type: 'invitation_rejected',
        invitation_id: Number(row.id),
        access_id: null,
        property_id: Number(row.property_id),
        landlord_id: Number(row.invitee_id),
        actor_id: Number(row.invitee_id),
        at: row.rejected_at,
      });
    }

    if (row.revoked_at) {
      events.push({
        type: 'invitation_revoked',
        invitation_id: Number(row.id),
        access_id: null,
        property_id: Number(row.property_id),
        landlord_id: Number(row.invitee_id),
        actor_id: row.revoked_by === null ? null : Number(row.revoked_by),
        at: row.revoked_at,
      });
    }
  }

  for (const row of accessRows.results ?? []) {
    events.push({
      type: 'access_granted',
      invitation_id: row.invitation_id === null ? null : Number(row.invitation_id),
      access_id: Number(row.id),
      property_id: Number(row.property_id),
      landlord_id: Number(row.landlord_id),
      actor_id: Number(row.granted_by),
      at: row.granted_at,
    });

    if (row.removed_at) {
      events.push({
        type: 'access_removed',
        invitation_id: row.invitation_id === null ? null : Number(row.invitation_id),
        access_id: Number(row.id),
        property_id: Number(row.property_id),
        landlord_id: Number(row.landlord_id),
        actor_id: row.removed_by === null ? null : Number(row.removed_by),
        at: row.removed_at,
      });
    }
  }

  return events.sort((left, right) => left.at.localeCompare(right.at));
}

export async function createPropertyInvitationNotification(
  db: D1Database,
  input: {
    inviteeId: number;
    invitationId: number;
    propertyId: number;
    propertyName: string;
    invitedByName: string;
  }
): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (?, 'property_invitation', 'Property access invitation', ?, ?)
      `
    )
    .bind(
      input.inviteeId,
      `${input.invitedByName} invited you to manage "${input.propertyName}".`,
      JSON.stringify({
        invitation_id: input.invitationId,
        property_id: input.propertyId,
        property_name: input.propertyName,
        invited_by_name: input.invitedByName,
      })
    )
    .run();
}

export async function deleteInvitationNotifications(
  db: D1Database,
  inviteeId: number,
  invitationId: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE notifications
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND type = 'property_invitation'
          AND deleted_at IS NULL
          AND json_extract(metadata, '$.invitation_id') = ?
      `
    )
    .bind(inviteeId, invitationId)
    .run();
}

export async function createPropertyAccessRemovedNotification(
  db: D1Database,
  input: {
    landlordId: number;
    propertyId: number;
    propertyName: string;
  }
): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (?, 'property_access_removed', 'Access removed', ?, ?)
      `
    )
    .bind(
      input.landlordId,
      `Your access to "${input.propertyName}" has been removed.`,
      JSON.stringify({
        property_id: input.propertyId,
        property_name: input.propertyName,
      })
    )
    .run();
}
