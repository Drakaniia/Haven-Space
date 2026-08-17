import { freeRoom } from './applications';
import { accessiblePropertyClause } from './property-access';

export interface TenancyRow {
  application_id: number;
  tenancy_start_date: string;
  property_id: number;
  property_name: string;
  address: string;
  city: string;
  province: string;
  room_id: number;
  room_title: string | null;
  room_number: string | null;
  monthly_rent: number;
  deposit: number;
  house_rules: string | null;
  leave_request_status: string | null;
  leave_request_date: string | null;
  leave_request_reason: string | null;
  intended_leave_date: string | null;
  landlord_id: number;
  landlord_first_name: string;
  landlord_last_name: string;
  landlord_email: string | null;
  landlord_phone: string | null;
  landlord_is_verified: number;
}

export interface TenancyData {
  application_id: number;
  property_id: number;
  property_name: string;
  address: string;
  city: string;
  province: string;
  room_id: number;
  room_title: string | null;
  room_number: string | null;
  tenancy_start_date: string;
  days_since_move_in: number;
  months_since_move_in: number;
  monthly_rent: number;
  deposit: number;
  house_rules: unknown[];
  leave_request_status: string;
  leave_request_date: string | null;
  leave_request_reason: string | null;
  intended_leave_date: string | null;
  property_electricity_cost: number;
  property_water_cost: number;
  property_internet_cost: number;
  landlord: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    is_verified: boolean;
  };
}

export interface BoarderNameRow {
  first_name: string;
  last_name: string;
}

export interface ConversationRow {
  id: number;
}

export interface PendingLeaveRequestRow {
  id: number;
  boarder_id: number;
  room_id: number;
  intended_leave_date: string | null;
  first_name: string;
  last_name: string;
}

export interface LeaveRequestResult {
  conversationId: number;
  messageId: number;
}

function numeric(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function parseJsonArray(value: string | null): unknown[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function dateFromSql(value: string): Date {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;

  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / msPerDay));
}

function fullMonthsBetween(start: Date, end: Date): number {
  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());

  if (end.getUTCDate() < start.getUTCDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

function formatLongDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date =
    Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
      ? new Date(Date.UTC(year, month - 1, day))
      : dateFromSql(value);

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function insertedId(result: D1Result, label: string): number {
  const id = Number(result.meta.last_row_id);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`${label} insert did not return an ID`);
  }

  return id;
}

export function formatTenancy(row: TenancyRow, now = new Date()): TenancyData {
  const start = dateFromSql(row.tenancy_start_date);
  const landlordName = [row.landlord_first_name, row.landlord_last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    application_id: Number(row.application_id),
    property_id: Number(row.property_id),
    property_name: row.property_name,
    address: row.address,
    city: row.city,
    province: row.province,
    room_id: Number(row.room_id),
    room_title: row.room_title,
    room_number: row.room_number,
    tenancy_start_date: row.tenancy_start_date,
    days_since_move_in: daysBetween(start, now),
    months_since_move_in: fullMonthsBetween(start, now),
    monthly_rent: numeric(row.monthly_rent),
    deposit: numeric(row.deposit),
    house_rules: parseJsonArray(row.house_rules),
    leave_request_status: row.leave_request_status ?? 'none',
    leave_request_date: row.leave_request_date ?? null,
    leave_request_reason: row.leave_request_reason ?? null,
    intended_leave_date: row.intended_leave_date ?? null,
    property_electricity_cost: 0,
    property_water_cost: 0,
    property_internet_cost: 0,
    landlord: {
      id: Number(row.landlord_id),
      name: landlordName,
      email: row.landlord_email ?? null,
      phone: row.landlord_phone ?? null,
      is_verified: Boolean(row.landlord_is_verified),
    },
  };
}

export async function findCurrentTenancy(
  db: D1Database,
  boarderId: number
): Promise<TenancyRow | null> {
  return await db
    .prepare(
      `
        SELECT
          app.id as application_id,
          app.created_at as tenancy_start_date,
          p.id as property_id,
          p.title as property_name,
          addr.address_line_1 as address,
          addr.city,
          addr.province,
          r.id as room_id,
          r.title as room_title,
          r.room_number,
          r.price as monthly_rent,
          r.deposit,
          p.house_rules,
          app.leave_request_status,
          app.leave_request_date,
          app.leave_request_reason,
          app.intended_leave_date,
          p.landlord_id,
          u.first_name as landlord_first_name,
          u.last_name as landlord_last_name,
          u.email as landlord_email,
          u.phone_number as landlord_phone,
          u.is_verified as landlord_is_verified
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        JOIN addresses addr ON p.address_id = addr.id
        JOIN users u ON p.landlord_id = u.id
        WHERE app.boarder_id = ?
          AND app.status IN ('accepted', 'confirmed')
          AND app.deleted_at IS NULL
        ORDER BY app.created_at DESC
        LIMIT 1
      `
    )
    .bind(boarderId)
    .first<TenancyRow>();
}

export async function findBoarderName(
  db: D1Database,
  boarderId: number
): Promise<BoarderNameRow | null> {
  return await db
    .prepare(
      `
        SELECT first_name, last_name
        FROM users
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(boarderId)
    .first<BoarderNameRow>();
}

export async function findLeaveConversation(
  db: D1Database,
  propertyId: number,
  boarderId: number,
  landlordId: number
): Promise<ConversationRow | null> {
  return await db
    .prepare(
      `
        SELECT c.id
        FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
        WHERE c.property_id = ?
          AND c.type = 'direct'
          AND cp1.user_id = ?
          AND cp2.user_id = ?
          AND cp1.is_active = 1
          AND cp2.is_active = 1
        LIMIT 1
      `
    )
    .bind(propertyId, boarderId, landlordId)
    .first<ConversationRow>();
}

export async function touchConversation(db: D1Database, conversationId: number): Promise<void> {
  await db
    .prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(conversationId)
    .run();
}

export async function createLeaveConversation(
  db: D1Database,
  title: string,
  propertyId: number,
  boarderId: number,
  landlordId: number
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO conversations (title, type, property_id, created_by, is_system_thread)
        VALUES (?, 'direct', ?, ?, 0)
      `
    )
    .bind(title, propertyId, boarderId)
    .run();
  const conversationId = insertedId(result, 'Conversation');

  await db
    .prepare(
      `
        INSERT INTO conversation_participants (conversation_id, user_id, role, is_active)
        VALUES (?, ?, ?, 1)
      `
    )
    .bind(conversationId, boarderId, 'boarder')
    .run();

  await db
    .prepare(
      `
        INSERT INTO conversation_participants (conversation_id, user_id, role, is_active)
        VALUES (?, ?, ?, 1)
      `
    )
    .bind(conversationId, landlordId, 'landlord')
    .run();

  return conversationId;
}

export async function createLeaveMessage(
  db: D1Database,
  conversationId: number,
  boarderId: number,
  messageText: string
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO messages (conversation_id, sender_id, message_text, has_attachment, is_read)
        VALUES (?, ?, ?, 0, 0)
      `
    )
    .bind(conversationId, boarderId, messageText)
    .run();

  return insertedId(result, 'Message');
}

export async function submitLeaveRequest(
  db: D1Database,
  applicationId: number,
  boarderId: number,
  reason: string,
  leaveDate: string
): Promise<void> {
  // Keep the application active (status stays confirmed, no soft delete) so the
  // boarder's tenancy remains visible in a "pending approval" state; the room
  // stays occupied until the landlord approves the request.
  await db
    .prepare(
      `
        UPDATE applications
        SET leave_request_status = 'pending',
            leave_request_date = date('now'),
            leave_request_reason = ?,
            intended_leave_date = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND boarder_id = ?
      `
    )
    .bind(reason, leaveDate, applicationId, boarderId)
    .run();
}

export async function resetBoarderStatus(db: D1Database, boarderId: number): Promise<void> {
  await db
    .prepare("UPDATE users SET boarder_status = 'new', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(boarderId)
    .run();
}

export async function cancelPendingBoarderPayments(
  db: D1Database,
  boarderId: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE payments
        SET status = 'cancelled',
            updated_at = CURRENT_TIMESTAMP
        WHERE boarder_id = ?
          AND status IN ('pending', 'overdue')
      `
    )
    .bind(boarderId)
    .run();
}

export async function findPendingLeaveRequest(
  db: D1Database,
  applicationId: number,
  landlordId: number
): Promise<PendingLeaveRequestRow | null> {
  return await db
    .prepare(
      `
        SELECT
          app.id,
          app.boarder_id,
          app.room_id,
          app.intended_leave_date,
          u.first_name,
          u.last_name
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        JOIN users u ON app.boarder_id = u.id
        WHERE app.id = ?
          AND app.leave_request_status = 'pending'
          AND app.status = 'confirmed'
          AND app.deleted_at IS NULL
          AND ${accessiblePropertyClause('p')}
        LIMIT 1
      `
    )
    .bind(applicationId, landlordId, landlordId)
    .first<PendingLeaveRequestRow>();
}

export async function declinePendingLeaveRequest(
  db: D1Database,
  applicationId: number
): Promise<void> {
  // Declining keeps the tenancy active (status/deleted_at untouched); the
  // boarder simply stays and may request to leave again later.
  await db
    .prepare(
      `
        UPDATE applications
        SET leave_request_status = 'declined',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(applicationId)
    .run();
}

export async function approvePendingLeaveRequest(
  db: D1Database,
  applicationId: number,
  boarderId: number,
  roomId: number
): Promise<void> {
  // Finalize the leave: move the confirmed application to the terminal `ended`
  // state, release the room, reset the boarder to room-searching state, and
  // cancel any pending payments.
  await db
    .prepare(
      `
        UPDATE applications
        SET leave_request_status = 'approved',
            status = 'ended',
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(applicationId)
    .run();

  await freeRoom(db, roomId);
  await resetBoarderStatus(db, boarderId);
  await cancelPendingBoarderPayments(db, boarderId);
}

export function buildLeaveMessage(
  boarderName: string,
  propertyName: string,
  reason: string,
  leaveDate: string,
  message: string
): { text: string; formattedDate: string } {
  const formattedDate = formatLongDate(leaveDate);
  const text = [
    'LEAVE REQUEST',
    '',
    `Boarder: ${boarderName}`,
    `Property: ${propertyName}`,
    `Reason: ${reason}`,
    `Intended Leave Date: ${formattedDate}`,
    '',
    'Message:',
    message,
    '',
    '---',
    'This is an automated leave request notification.',
  ].join('\n');

  return { text, formattedDate };
}
