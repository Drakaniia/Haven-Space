import { accessiblePropertyClause } from '../property-access/helpers';
import { DEFAULT_GRACE_DAYS, roundMoney, toDateOnly } from './helpers';

/**
 * Landlord-side writes: manual utility/ad-hoc charges (spec D9), billing
 * settings (D17/D19/D20), and the deposit resolution at move-out (D11).
 *
 * Every statement is scoped by property access, so a shared property's
 * co-landlord can manage exactly what they can already see.
 */

export interface PropertyBillingSettings {
  property_id: number;
  late_fee_amount: number;
  /** The single grace period (R6/D31): drives the `in_grace` state and the fee timing. */
  late_fee_grace_days: number;
  late_fee_enabled: number;
  late_fee_type: string;
  late_fee_percent: number;
  electricity_cost: number;
  water_cost: number;
  internet_cost: number;
}

interface BillingSettingsRow {
  id: number;
  late_fee_amount: number | string;
  late_fee_grace_days: number | string;
  late_fee_enabled: number | string | null;
  late_fee_type: string | null;
  late_fee_percent: number | string | null;
  electricity_cost: number | string;
  water_cost: number | string;
  internet_cost: number | string;
}

const ACCESS_SCOPED_PROPERTY = `(
  ${accessiblePropertyClause()}
)`;

export async function findPropertyBillingSettings(
  db: D1Database,
  propertyId: number,
  landlordId: number
): Promise<PropertyBillingSettings | null> {
  const row = await db
    .prepare(
      `
        SELECT
          id, late_fee_amount, late_fee_grace_days, late_fee_enabled,
          late_fee_type, late_fee_percent, electricity_cost, water_cost, internet_cost
        FROM properties
        WHERE id = ?
          AND deleted_at IS NULL
          AND ${ACCESS_SCOPED_PROPERTY}
      `
    )
    .bind(propertyId, landlordId, landlordId)
    .first<BillingSettingsRow>();

  if (!row) {
    return null;
  }

  return {
    property_id: Number(row.id),
    late_fee_amount: roundMoney(Number(row.late_fee_amount ?? 0)),
    late_fee_grace_days: Number(row.late_fee_grace_days ?? DEFAULT_GRACE_DAYS),
    late_fee_enabled: Number(row.late_fee_enabled ?? 1) === 1 ? 1 : 0,
    late_fee_type: row.late_fee_type === 'percent' ? 'percent' : 'fixed',
    late_fee_percent: Number(row.late_fee_percent ?? 0),
    electricity_cost: roundMoney(Number(row.electricity_cost ?? 0)),
    water_cost: roundMoney(Number(row.water_cost ?? 0)),
    internet_cost: roundMoney(Number(row.internet_cost ?? 0)),
  };
}

export async function updatePropertyBillingSettings(
  db: D1Database,
  propertyId: number,
  landlordId: number,
  input: Partial<Omit<PropertyBillingSettings, 'property_id'>>
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE properties
        SET late_fee_amount = COALESCE(?, late_fee_amount),
            late_fee_grace_days = COALESCE(?, late_fee_grace_days),
            late_fee_enabled = COALESCE(?, late_fee_enabled),
            late_fee_type = COALESCE(?, late_fee_type),
            late_fee_percent = COALESCE(?, late_fee_percent),
            electricity_cost = COALESCE(?, electricity_cost),
            water_cost = COALESCE(?, water_cost),
            internet_cost = COALESCE(?, internet_cost),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
          AND ${ACCESS_SCOPED_PROPERTY}
      `
    )
    .bind(
      input.late_fee_amount ?? null,
      input.late_fee_grace_days ?? null,
      input.late_fee_enabled === undefined ? null : input.late_fee_enabled ? 1 : 0,
      input.late_fee_type ?? null,
      input.late_fee_percent ?? null,
      input.electricity_cost ?? null,
      input.water_cost ?? null,
      input.internet_cost ?? null,
      propertyId,
      landlordId,
      landlordId
    )
    .run();

  return Number(result.meta.changes ?? 0);
}

export interface CreateManualChargeInput {
  applicationId: number;
  boarderId: number;
  landlordId: number;
  roomId: number;
  propertyId: number;
  chargeType: string;
  amount: number;
  dueDate: string;
  description: string;
  createdBy: number;
}

export async function createManualCharge(
  db: D1Database,
  input: CreateManualChargeInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO payments (
          boarder_id, landlord_id, room_id, property_id, application_id,
          charge_type, description, amount, due_date, status, created_by,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .bind(
      input.boarderId,
      input.landlordId,
      input.roomId,
      input.propertyId,
      input.applicationId,
      input.chargeType,
      input.description,
      roundMoney(input.amount),
      toDateOnly(input.dueDate),
      input.createdBy
    )
    .run();

  return Number(result.meta.last_row_id ?? 0);
}

/** Tenant-visible charge fields a landlord may correct while it is still open. */
export interface UpdateChargeInput {
  amount?: number;
  dueDate?: string;
  description?: string;
}

export async function updateCharge(
  db: D1Database,
  chargeId: number,
  landlordId: number,
  input: UpdateChargeInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE payments
        SET amount = COALESCE(?, amount),
            due_date = COALESCE(?, due_date),
            description = COALESCE(?, description),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND status IN ('pending', 'awaiting_verification', 'overdue')
          AND property_id IN (
            SELECT p.id FROM properties p
            WHERE p.deleted_at IS NULL AND ${accessiblePropertyClause('p')}
          )
      `
    )
    .bind(
      input.amount === undefined ? null : roundMoney(input.amount),
      input.dueDate === undefined ? null : toDateOnly(input.dueDate),
      input.description ?? null,
      chargeId,
      landlordId,
      landlordId
    )
    .run();

  return Number(result.meta.changes ?? 0);
}

export async function cancelCharge(
  db: D1Database,
  chargeId: number,
  landlordId: number
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE payments
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND status IN ('pending', 'awaiting_verification', 'overdue')
          AND property_id IN (
            SELECT p.id FROM properties p
            WHERE p.deleted_at IS NULL AND ${accessiblePropertyClause('p')}
          )
      `
    )
    .bind(chargeId, landlordId, landlordId)
    .run();

  return Number(result.meta.changes ?? 0);
}

export interface DepositResolutionInput {
  resolution: 'refund' | 'forfeit' | 'partial';
  amount: number;
  reason: string;
}

export async function resolveDeposit(
  db: D1Database,
  chargeId: number,
  landlordId: number,
  input: DepositResolutionInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE payments
        SET deposit_resolution = ?,
            deposit_resolution_amount = ?,
            deposit_resolution_reason = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND charge_type = 'deposit'
          AND property_id IN (
            SELECT p.id FROM properties p
            WHERE p.deleted_at IS NULL AND ${accessiblePropertyClause('p')}
          )
      `
    )
    .bind(
      input.resolution,
      roundMoney(input.amount),
      input.reason,
      chargeId,
      landlordId,
      landlordId
    )
    .run();

  return Number(result.meta.changes ?? 0);
}

export async function setApplicationAdvanceAmount(
  db: D1Database,
  applicationId: number,
  landlordId: number,
  amount: number
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE applications
        SET advance_amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
          AND room_id IN (
            SELECT r.id FROM rooms r
            JOIN properties p ON r.property_id = p.id
            WHERE p.deleted_at IS NULL AND ${accessiblePropertyClause('p')}
          )
      `
    )
    .bind(roundMoney(amount), applicationId, landlordId, landlordId)
    .run();

  return Number(result.meta.changes ?? 0);
}
