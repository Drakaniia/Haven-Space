export interface ApplicationListRow {
  id: number;
  boarder_id: number;
  landlord_id: number;
  room_id: number;
  message: string | null;
  status: string;
  payment_method: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  room_title: string | null;
  room_price: number;
  property_title: string;
  property_address: string;
  property_id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  landlord_email?: string | null;
}

export interface ApplicationDetailRow {
  id: number;
  boarder_id: number;
  landlord_id: number;
  room_id: number;
  message: string | null;
  status: string;
  payment_method: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  room_title: string | null;
  room_price: number;
  property_title: string;
  property_address: string;
  property_description: string | null;
  latitude: number | null;
  longitude: number | null;
  property_id: number;
  boarder_first_name: string;
  boarder_last_name: string;
  boarder_email: string | null;
  boarder_avatar: string | null;
  landlord_first_name: string;
  landlord_last_name: string;
  landlord_email: string | null;
  landlord_avatar: string | null;
}

export interface ApplicationRoomRow {
  id: number;
  property_id: number;
  status: string;
}

export interface ExistingApplicationRow {
  id: number;
  status: string;
  deleted_at: string | null;
}

export interface CreateApplicationInput {
  boarderId: number;
  landlordId: number;
  roomId: number;
  message: string;
  status: string;
}

import { accessiblePropertyClause } from './property-access';

function propertyAddressExpression(): string {
  return `a.address_line_1 || ', ' || a.city || ', ' || a.province`;
}

export async function listBoarderApplications(
  db: D1Database,
  boarderId: number
): Promise<ApplicationListRow[]> {
  const result = await db
    .prepare(
      `
        SELECT
          app.*,
          r.title as room_title,
          r.price as room_price,
          p.title as property_title,
          ${propertyAddressExpression()} as property_address,
          p.id as property_id,
          u.first_name,
          u.last_name,
          u.email as landlord_email
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        JOIN addresses a ON p.address_id = a.id
        JOIN users u ON p.landlord_id = u.id
        WHERE app.boarder_id = ?
          AND app.deleted_at IS NULL
        ORDER BY app.created_at DESC
      `
    )
    .bind(boarderId)
    .all<ApplicationListRow>();

  return result.results ?? [];
}

export async function listLandlordApplications(
  db: D1Database,
  landlordId: number
): Promise<ApplicationListRow[]> {
  const result = await db
    .prepare(
      `
        SELECT
          app.*,
          r.title as room_title,
          r.price as room_price,
          p.title as property_title,
          ${propertyAddressExpression()} as property_address,
          p.id as property_id,
          u.first_name,
          u.last_name,
          u.email
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        JOIN addresses a ON p.address_id = a.id
        JOIN users u ON app.boarder_id = u.id
        WHERE app.deleted_at IS NULL
          AND ${accessiblePropertyClause('p')}
        ORDER BY app.created_at DESC
      `
    )
    .bind(landlordId, landlordId)
    .all<ApplicationListRow>();

  return result.results ?? [];
}

export async function findApplicationById(
  db: D1Database,
  applicationId: number
): Promise<ApplicationDetailRow | null> {
  return await db
    .prepare(
      `
        SELECT
          app.*,
          r.title as room_title,
          r.price as room_price,
          p.title as property_title,
          ${propertyAddressExpression()} as property_address,
          p.description as property_description,
          a.latitude,
          a.longitude,
          r.property_id,
          ub.first_name as boarder_first_name,
          ub.last_name as boarder_last_name,
          ub.email as boarder_email,
          NULL as boarder_avatar,
          ul.first_name as landlord_first_name,
          ul.last_name as landlord_last_name,
          ul.email as landlord_email,
          NULL as landlord_avatar
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        JOIN addresses a ON p.address_id = a.id
        JOIN users ub ON app.boarder_id = ub.id
        JOIN users ul ON app.landlord_id = ul.id
        WHERE app.id = ?
          AND app.deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(applicationId)
    .first<ApplicationDetailRow>();
}

export async function findApplicationRoom(
  db: D1Database,
  roomId: number
): Promise<ApplicationRoomRow | null> {
  return await db
    .prepare(
      `
        SELECT id, property_id, status
        FROM rooms
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(roomId)
    .first<ApplicationRoomRow>();
}

export async function occupyRoom(db: D1Database, roomId: number): Promise<void> {
  await db
    .prepare("UPDATE rooms SET status = 'occupied', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(roomId)
    .run();
}

export async function freeRoom(db: D1Database, roomId: number): Promise<void> {
  await db
    .prepare("UPDATE rooms SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(roomId)
    .run();
}

export async function findExistingApplicationForRoom(
  db: D1Database,
  boarderId: number,
  roomId: number
): Promise<ExistingApplicationRow | null> {
  return await db
    .prepare(
      `
        SELECT id, status, deleted_at
        FROM applications
        WHERE boarder_id = ?
          AND room_id = ?
        ORDER BY deleted_at IS NOT NULL ASC, id DESC
        LIMIT 1
      `
    )
    .bind(boarderId, roomId)
    .first<ExistingApplicationRow>();
}

export async function hardDeleteApplication(db: D1Database, applicationId: number): Promise<void> {
  await db.prepare('DELETE FROM applications WHERE id = ?').bind(applicationId).run();
}

export async function softDeleteApplication(db: D1Database, applicationId: number): Promise<void> {
  // Withdrawal ends the application: move it to the terminal `cancelled` status
  // and hide it from all lists. Only pending/accepted applications reach this
  // path (enforced by the routes against the state machine).
  await db
    .prepare(
      `
        UPDATE applications
        SET status = 'cancelled',
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(applicationId)
    .run();
}

export async function confirmApplicationBooking(
  db: D1Database,
  applicationId: number,
  paymentMethod: string
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE applications
        SET status = 'confirmed',
            payment_method = ?,
            confirmed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(paymentMethod, applicationId)
    .run();
}

export async function updateBoarderStatus(
  db: D1Database,
  boarderId: number,
  status: string
): Promise<void> {
  await db
    .prepare('UPDATE users SET boarder_status = ? WHERE id = ?')
    .bind(status, boarderId)
    .run();
}

export async function cancelOtherBoarderApplications(
  db: D1Database,
  boarderId: number,
  applicationId: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE applications
        SET status = ?,
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE boarder_id = ?
          AND id != ?
          AND status IN (?, ?)
      `
    )
    .bind('cancelled', boarderId, applicationId, 'pending', 'accepted')
    .run();
}

export async function updateApplicationStatus(
  db: D1Database,
  applicationId: number,
  status: string
): Promise<void> {
  await db
    .prepare('UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(status, applicationId)
    .run();
}

export async function verifyBoarderEmail(db: D1Database, boarderId: number): Promise<void> {
  await db
    .prepare('UPDATE users SET email_verified = 1 WHERE id = ? AND email_verified = 0')
    .bind(boarderId)
    .run();
}

export async function createApplication(
  db: D1Database,
  input: CreateApplicationInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO applications (boarder_id, landlord_id, room_id, message, status)
        VALUES (?, ?, ?, ?, ?)
      `
    )
    .bind(input.boarderId, input.landlordId, input.roomId, input.message, input.status)
    .run();
  const applicationId = Number(result.meta.last_row_id);

  if (!Number.isFinite(applicationId) || applicationId <= 0) {
    throw new Error('Application insert did not return an ID');
  }

  return applicationId;
}
