import { accessiblePropertyClause } from './property-access';

export interface LandlordBoarderRow {
  application_id: number;
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  room_id: number | null;
  room_title: string | null;
  rent: number | null;
  deposit: number | null;
  move_in_date: string | null;
  application_message: string | null;
  leave_request_status: string | null;
  intended_leave_date: string | null;
  leave_request_reason: string | null;
}

export interface LandlordBoarderListItem {
  id: number;
  application_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  room_id: number | null;
  room_title: string | null;
  rent: number;
  deposit: number;
  move_in_date: string | null;
  application_message: string | null;
  status: string;
  leave_request_status: string;
  intended_leave_date: string | null;
  leave_request_reason: string | null;
  payment_status: string;
  payment_due_day: number;
  last_payment_date: string | null;
}

export interface BoarderUserIdentityRow {
  id: number;
}

export interface BoarderApplicationIdentityRow {
  id: number;
  room_id: number;
}

export interface CreateManualBoarderInput {
  firstName: string;
  lastName: string;
  email: string;
}

export interface CreateBoarderApplicationInput {
  boarderId: number;
  landlordId: number;
  roomId: number;
  moveInDate: string;
}

export interface UpdateBoarderInput {
  firstName: string;
  lastName: string;
  email: string;
}

function numeric(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function boarderStatus(row: LandlordBoarderRow): string {
  if (row.leave_request_status === 'pending') {
    return 'leaving';
  }

  if (row.leave_request_status === 'approved') {
    return 'leaving_approved';
  }

  return 'active';
}

export function formatLandlordBoarder(row: LandlordBoarderRow): LandlordBoarderListItem {
  return {
    id: Number(row.id),
    application_id: Number(row.application_id),
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email ?? null,
    phone: row.phone_number ?? null,
    avatar_url: row.avatar_url ?? null,
    room_id: row.room_id === null || row.room_id === undefined ? null : Number(row.room_id),
    room_title: row.room_title ?? null,
    rent: numeric(row.rent),
    deposit: numeric(row.deposit),
    move_in_date: row.move_in_date ?? null,
    application_message: row.application_message ?? null,
    status: boarderStatus(row),
    leave_request_status: row.leave_request_status ?? 'none',
    intended_leave_date: row.intended_leave_date ?? null,
    leave_request_reason: row.leave_request_reason ?? null,
    payment_status: 'paid',
    payment_due_day: 15,
    last_payment_date: null,
  };
}

export async function listLandlordBoarders(
  db: D1Database,
  propertyId: number,
  landlordId: number
): Promise<LandlordBoarderListItem[]> {
  const result = await db
    .prepare(
      `
        SELECT
          app.id AS application_id,
          u.id AS id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.avatar_url,
          app.room_id,
          COALESCE(r.room_number, r.title) AS room_title,
          r.price AS rent,
          r.deposit AS deposit,
          app.created_at AS move_in_date,
          app.message AS application_message,
          app.leave_request_status,
          app.intended_leave_date,
          app.leave_request_reason
        FROM applications app
        JOIN users u ON app.boarder_id = u.id
        JOIN rooms r ON app.room_id = r.id
        WHERE r.property_id = ?
          AND app.status IN ('accepted', 'approved', 'confirmed')
          AND app.deleted_at IS NULL
          AND u.deleted_at IS NULL
          AND r.deleted_at IS NULL
        ORDER BY app.created_at DESC
      `
    )
    .bind(propertyId)
    .all<LandlordBoarderRow>();

  return (result.results ?? []).map(formatLandlordBoarder);
}

function insertedId(result: D1Result, label: string): number {
  const id = Number(result.meta.last_row_id);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`${label} insert did not return an ID`);
  }

  return id;
}

export async function findBoarderUserByEmail(
  db: D1Database,
  email: string
): Promise<BoarderUserIdentityRow | null> {
  return await db
    .prepare(
      `
        SELECT id
        FROM users
        WHERE lower(email) = lower(?)
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(email)
    .first<BoarderUserIdentityRow>();
}

export async function createManualBoarderUser(
  db: D1Database,
  input: CreateManualBoarderInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO users (
          first_name,
          last_name,
          email,
          role,
          is_verified,
          email_verified,
          account_status,
          boarder_status
        )
        VALUES (?, ?, ?, 'boarder', 0, 0, 'active', 'accepted')
      `
    )
    .bind(input.firstName, input.lastName, input.email)
    .run();

  return insertedId(result, 'Boarder user');
}

export async function createManualBoarderApplication(
  db: D1Database,
  input: CreateBoarderApplicationInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO applications (boarder_id, landlord_id, room_id, message, status, created_at)
        VALUES (?, ?, ?, '', 'accepted', ?)
      `
    )
    .bind(input.boarderId, input.landlordId, input.roomId, input.moveInDate)
    .run();

  return insertedId(result, 'Boarder application');
}

export async function findLandlordBoarderApplication(
  db: D1Database,
  boarderId: number,
  landlordId: number,
  propertyId: number
): Promise<BoarderApplicationIdentityRow | null> {
  return await db
    .prepare(
      `
        SELECT app.id, app.room_id
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        WHERE app.boarder_id = ?
          AND app.status IN ('accepted', 'approved', 'confirmed')
          AND app.deleted_at IS NULL
          AND r.property_id = ?
        LIMIT 1
      `
    )
    .bind(boarderId, propertyId)
    .first<BoarderApplicationIdentityRow>();
}

export async function updateBoarderUser(
  db: D1Database,
  boarderId: number,
  input: UpdateBoarderInput
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE users
        SET first_name = ?,
            last_name = ?,
            email = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
      `
    )
    .bind(input.firstName, input.lastName, input.email, boarderId)
    .run();
}

export async function updateBoarderApplication(
  db: D1Database,
  applicationId: number,
  roomId: number,
  moveInDate: string
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE applications
        SET room_id = ?,
            created_at = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(roomId, moveInDate, applicationId)
    .run();
}

export async function updateBoarderRoomPricing(
  db: D1Database,
  roomId: number,
  propertyId: number,
  rent: number,
  deposit: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE rooms
        SET price = ?,
            deposit = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND property_id = ?
      `
    )
    .bind(rent, deposit, roomId, propertyId)
    .run();
}

export async function softDeleteLandlordBoarderApplications(
  db: D1Database,
  boarderId: number,
  landlordId: number
): Promise<number> {
  // The delete route has no property id, so scope the removal to applications
  // whose room belongs to a property the caller owns or shares.
  const result = await db
    .prepare(
      `
        UPDATE applications
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE boarder_id = ?
          AND status IN ('accepted', 'approved', 'confirmed')
          AND deleted_at IS NULL
          AND room_id IN (
            SELECT r.id
            FROM rooms r
            JOIN properties p ON r.property_id = p.id
            WHERE ${accessiblePropertyClause('p')}
          )
      `
    )
    .bind(boarderId, landlordId, landlordId)
    .run();

  return Number(result.meta.changes ?? 0);
}
