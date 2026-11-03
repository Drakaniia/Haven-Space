import {
  NO_OUTSTANDING_BALANCE,
  dateFromSql,
  daysBetween,
  fullMonthsBetween,
  numeric,
  parseJsonArray,
} from './helpers';
import type { BoarderNameRow, OutstandingBalance, TenancyData, TenancyRow } from './types';

export function formatTenancy(
  row: TenancyRow,
  now = new Date(),
  balance: OutstandingBalance = NO_OUTSTANDING_BALANCE
): TenancyData {
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
    // Real rates from the property's billing settings — these were hard-coded
    // zeros until the payments feature gave them a home (spec `payments-feature` I8).
    property_electricity_cost: numeric(row.property_electricity_cost),
    property_water_cost: numeric(row.property_water_cost),
    property_internet_cost: numeric(row.property_internet_cost),
    outstanding_balance: balance.outstanding_balance,
    open_charge_count: balance.open_charge_count,
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
          u.is_verified as landlord_is_verified,
          p.electricity_cost as property_electricity_cost,
          p.water_cost as property_water_cost,
          p.internet_cost as property_internet_cost
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

/**
 * Any user's display name — the boarder on a leave request, the landlord who
 * approves it (spec `approve-leave-request` §4.1).
 */
export async function findUserName(db: D1Database, userId: number): Promise<BoarderNameRow | null> {
  return await findBoarderName(db, userId);
}

export async function outstandingBalanceForApplication(
  db: D1Database,
  applicationId: number
): Promise<OutstandingBalance> {
  const row = await db
    .prepare(
      `
        SELECT
          COALESCE(SUM(amount + COALESCE(late_fee, 0)), 0) AS outstanding_balance,
          COUNT(*) AS open_charge_count
        FROM payments
        WHERE application_id = ?
          AND status IN ('pending', 'awaiting_verification', 'overdue')
      `
    )
    .bind(applicationId)
    .first<{
      outstanding_balance: number | string | null;
      open_charge_count: number | string | null;
    }>();

  return {
    outstanding_balance: Math.round(numeric(row?.outstanding_balance) * 100) / 100,
    open_charge_count: Math.round(numeric(row?.open_charge_count)),
  };
}
