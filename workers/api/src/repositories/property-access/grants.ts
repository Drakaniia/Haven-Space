import type { D1Database, D1Result } from '@cloudflare/workers-types';
import type {
  PropertyAccessRow,
  InviteeLandlordRow,
  PropertyForAccessRow,
  AuthorizedLandlordRow,
  PropertyAccessOverviewRow,
  LandlordCreatedDataCounts,
  GrantPropertyAccessInput,
} from './types.js';
import { accessiblePropertyClause, insertedId, firstWhere } from './helpers.js';

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
