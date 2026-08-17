export interface PropertyInvitationRow {
  id: number;
  property_id: number;
  invitee_id: number;
  invited_by: number;
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  accepted_at: string | null;
  rejected_at: string | null;
  revoked_at: string | null;
  revoked_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PropertyAccessRow {
  id: number;
  property_id: number;
  landlord_id: number;
  granted_by: number;
  invitation_id: number | null;
  granted_at: string;
  removed_at: string | null;
  removed_by: number | null;
}

export interface InviteeLandlordRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_verified: number;
  account_status: string;
}

export interface PropertyForAccessRow {
  id: number;
  title: string;
  landlord_id: number;
}

export interface InvitationListItemRow {
  id: number;
  property_id: number;
  property_name: string;
  owner_first_name: string;
  owner_last_name: string;
  owner_email: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  revoked_at: string | null;
}

export interface PendingInvitationRow {
  id: number;
  invitee_id: number;
  invitee_first_name: string;
  invitee_last_name: string;
  invitee_email: string;
  invited_by: number;
  created_at: string;
}

export interface AuthorizedLandlordRow {
  id: number;
  landlord_id: number;
  first_name: string;
  last_name: string;
  email: string;
  granted_by: number;
  granted_at: string;
}

export interface PropertyAccessOverviewRow {
  property_id: number;
  property_title: string;
  owner_id: number;
  owner_first_name: string;
  owner_last_name: string;
  owner_email: string;
}

export interface LandlordCreatedDataCounts {
  rooms: number;
  tenants: number;
  payments: number;
  announcements: number;
}

export type AccessHistoryEventType =
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_rejected'
  | 'invitation_revoked'
  | 'access_granted'
  | 'access_removed';

export interface AccessHistoryEvent {
  type: AccessHistoryEventType;
  invitation_id: number | null;
  access_id: number | null;
  property_id: number;
  landlord_id: number;
  actor_id: number | null;
  at: string;
}

export interface CreatePropertyInvitationInput {
  propertyId: number;
  inviteeId: number;
  invitedBy: number;
}

export interface GrantPropertyAccessInput {
  propertyId: number;
  landlordId: number;
  grantedBy: number;
  invitationId: number | null;
}

// SQL fragment that is true when the current properties row is accessible to a
// landlord: the landlord owns the property (`landlord_id`) OR has an active
// shared-access row in `property_access`. Pass `alias` (e.g. `'p'`) when the
// properties table is aliased in the query and column references would
// otherwise be ambiguous. Consumes two `?` binds — both bound to the landlord id.
export function accessiblePropertyClause(alias?: string): string {
  const ownerColumn = alias ? `${alias}.landlord_id` : 'landlord_id';
  const idColumn = alias ? `${alias}.id` : 'id';

  return `(
    ${ownerColumn} = ?
    OR ${idColumn} IN (
      SELECT pa.property_id
      FROM property_access pa
      WHERE pa.landlord_id = ? AND pa.removed_at IS NULL
    )
  )`;
}

function insertedId(result: D1Result, label: string): number {
  const id = Number(result.meta.last_row_id);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`${label} insert did not return an ID`);
  }

  return id;
}

function firstWhere<T>(
  db: D1Database,
  sql: string,
  binds: unknown[],
  label: string
): Promise<T | null> {
  return db
    .prepare(sql)
    .bind(...binds)
    .first<T>();
}

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

export async function findActiveAccess(
  db: D1Database,
  propertyId: number,
  landlordId: number
): Promise<PropertyAccessRow | null> {
  return await firstWhere<PropertyAccessRow>(
    db,
    `
      SELECT *
      FROM property_access
      WHERE property_id = ?
        AND landlord_id = ?
        AND removed_at IS NULL
      LIMIT 1
    `,
    [propertyId, landlordId],
    'Property access'
  );
}

export async function findInviteeLandlord(
  db: D1Database,
  inviteeId: number
): Promise<InviteeLandlordRow | null> {
  return await firstWhere<InviteeLandlordRow>(
    db,
    `
      SELECT id, first_name, last_name, email, role, is_verified, account_status
      FROM users
      WHERE id = ?
        AND role = 'landlord'
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [inviteeId],
    'Invitee landlord'
  );
}

export async function findPropertyForAccess(
  db: D1Database,
  propertyId: number
): Promise<PropertyForAccessRow | null> {
  return await firstWhere<PropertyForAccessRow>(
    db,
    `
      SELECT id, title, landlord_id
      FROM properties
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [propertyId],
    'Property'
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

export async function listAuthorizedLandlords(
  db: D1Database,
  propertyId: number
): Promise<AuthorizedLandlordRow[]> {
  const result = await db
    .prepare(
      `
        SELECT
          pa.id,
          pa.landlord_id,
          pa.granted_by,
          pa.granted_at,
          u.first_name,
          u.last_name,
          u.email
        FROM property_access pa
        JOIN users u ON pa.landlord_id = u.id
        WHERE pa.property_id = ?
          AND pa.removed_at IS NULL
        ORDER BY pa.granted_at ASC
      `
    )
    .bind(propertyId)
    .all<AuthorizedLandlordRow>();

  return result.results ?? [];
}

export async function listAccessiblePropertyIds(
  db: D1Database,
  landlordId: number
): Promise<number[]> {
  const result = await db
    .prepare(
      `
        SELECT property_id
        FROM property_access
        WHERE landlord_id = ?
          AND removed_at IS NULL
      `
    )
    .bind(landlordId)
    .all<{ property_id: number }>();

  return (result.results ?? []).map(row => Number(row.property_id));
}

export async function listPropertyAccessOverview(
  db: D1Database
): Promise<PropertyAccessOverviewRow[]> {
  const result = await db
    .prepare(
      `
        SELECT
          p.id AS property_id,
          p.title AS property_title,
          p.landlord_id AS owner_id,
          u.first_name AS owner_first_name,
          u.last_name AS owner_last_name,
          u.email AS owner_email
        FROM properties p
        JOIN users u ON p.landlord_id = u.id
        WHERE p.deleted_at IS NULL
        ORDER BY p.created_at DESC
      `
    )
    .bind()
    .all<PropertyAccessOverviewRow>();

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

export async function grantPropertyAccess(
  db: D1Database,
  input: GrantPropertyAccessInput
): Promise<number> {
  const result = await db
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
    .bind(input.propertyId, input.landlordId, input.grantedBy, input.invitationId)
    .run();

  return insertedId(result, 'Property access');
}

export async function removePropertyAccess(
  db: D1Database,
  propertyId: number,
  landlordId: number,
  removedBy: number
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE property_access
        SET removed_at = CURRENT_TIMESTAMP,
            removed_by = ?
        WHERE property_id = ?
          AND landlord_id = ?
          AND removed_at IS NULL
      `
    )
    .bind(removedBy, propertyId, landlordId)
    .run();

  return Number(result.meta.changes ?? 0);
}

export async function countLandlordCreatedData(
  db: D1Database,
  propertyId: number,
  landlordId: number
): Promise<LandlordCreatedDataCounts> {
  const roomRow = await firstWhere<{ count: number }>(
    db,
    `
      SELECT COUNT(*) AS count
      FROM rooms
      WHERE property_id = ?
        AND landlord_id = ?
        AND deleted_at IS NULL
    `,
    [propertyId, landlordId],
    'Room count'
  );
  const tenantRow = await firstWhere<{ count: number }>(
    db,
    `
      SELECT COUNT(*) AS count
      FROM applications app
      JOIN rooms r ON app.room_id = r.id
      WHERE r.property_id = ?
        AND app.landlord_id = ?
        AND app.status IN ('accepted', 'confirmed')
        AND app.deleted_at IS NULL
    `,
    [propertyId, landlordId],
    'Tenant count'
  );
  const paymentRow = await firstWhere<{ count: number }>(
    db,
    `
      SELECT COUNT(*) AS count
      FROM payments
      WHERE property_id = ?
        AND landlord_id = ?
    `,
    [propertyId, landlordId],
    'Payment count'
  );
  const announcementRow = await firstWhere<{ count: number }>(
    db,
    `
      SELECT COUNT(*) AS count
      FROM announcements a
      JOIN announcement_properties ap ON a.id = ap.announcement_id
      WHERE ap.property_id = ?
        AND a.landlord_id = ?
        AND a.deleted_at IS NULL
    `,
    [propertyId, landlordId],
    'Announcement count'
  );

  return {
    rooms: Number(roomRow?.count ?? 0),
    tenants: Number(tenantRow?.count ?? 0),
    payments: Number(paymentRow?.count ?? 0),
    announcements: Number(announcementRow?.count ?? 0),
  };
}

export async function revokeAllForLandlord(
  db: D1Database,
  landlordId: number,
  actedBy: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE property_invitations
        SET status = 'revoked',
            revoked_at = CURRENT_TIMESTAMP,
            revoked_by = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE invitee_id = ?
          AND status = 'pending'
          AND deleted_at IS NULL
      `
    )
    .bind(actedBy, landlordId)
    .run();
  await db
    .prepare(
      `
        UPDATE property_access
        SET removed_at = CURRENT_TIMESTAMP,
            removed_by = ?
        WHERE landlord_id = ?
          AND removed_at IS NULL
      `
    )
    .bind(actedBy, landlordId)
    .run();
}

export async function revokeAllForProperty(
  db: D1Database,
  propertyId: number,
  actedBy: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE property_invitations
        SET status = 'revoked',
            revoked_at = CURRENT_TIMESTAMP,
            revoked_by = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE property_id = ?
          AND status = 'pending'
          AND deleted_at IS NULL
      `
    )
    .bind(actedBy, propertyId)
    .run();
  await db
    .prepare(
      `
        UPDATE property_access
        SET removed_at = CURRENT_TIMESTAMP,
            removed_by = ?
        WHERE property_id = ?
          AND removed_at IS NULL
      `
    )
    .bind(actedBy, propertyId)
    .run();
}

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
