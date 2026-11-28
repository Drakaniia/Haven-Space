import {
  DEFAULT_HORIZON_MONTHS,
  addMonthsClamped,
  monthLabel,
  nextDueAfter,
  parseAdvanceAmount,
  roundMoney,
  toDateOnly,
} from './helpers';

/**
 * Schedule generation (spec `payments-feature` §6.1, updated for single-cycle billing).
 *
 * On booking confirmation a tenancy gets its move-in charges (deposit and
 * advance, due on move-in) plus its first monthly rent charge (due one month
 * later). Subsequent rent cycles are created one at a time upon settlement.
 */

export interface ScheduleInputRow {
  application_id: number;
  boarder_id: number;
  landlord_id: number;
  room_id: number;
  property_id: number;
  room_price: number | string;
  room_deposit: number | string;
  property_advance: string | null;
  advance_amount: number | string;
  start_date: string;
}

export interface ScheduleResult {
  created: number;
  first_due_date: string | null;
}

interface InsertChargeInput {
  applicationId: number;
  boarderId: number;
  landlordId: number;
  roomId: number;
  propertyId: number;
  chargeType: string;
  amount: number;
  dueDate: string;
  description: string;
  generationKey: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  createdBy?: number | null;
}

async function insertCharge(db: D1Database, input: InsertChargeInput): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT OR IGNORE INTO payments (
          boarder_id, landlord_id, room_id, property_id, application_id,
          charge_type, description, amount, due_date, period_start, period_end,
          status, generation_key, created_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
      input.amount,
      input.dueDate,
      input.periodStart ?? null,
      input.periodEnd ?? null,
      input.generationKey,
      input.createdBy ?? null
    )
    .run();

  return Number(result.meta.changes ?? 0);
}

export async function findScheduleInput(
  db: D1Database,
  applicationId: number
): Promise<ScheduleInputRow | null> {
  return await db
    .prepare(
      `
        SELECT
          app.id AS application_id,
          app.boarder_id,
          app.landlord_id,
          app.room_id,
          r.property_id,
          r.price AS room_price,
          r.deposit AS room_deposit,
          p.advance AS property_advance,
          COALESCE(app.advance_amount, 0) AS advance_amount,
          COALESCE(app.confirmed_at, app.created_at) AS start_date
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        WHERE app.id = ?
          AND app.status = 'confirmed'
          AND app.deleted_at IS NULL
      `
    )
    .bind(applicationId)
    .first<ScheduleInputRow>();
}

export async function generateScheduleForApplication(
  db: D1Database,
  applicationId: number,
  options: { horizonMonths?: number } = {}
): Promise<ScheduleResult> {
  const horizonMonths = Math.max(options.horizonMonths ?? DEFAULT_HORIZON_MONTHS, 1);
  const input = await findScheduleInput(db, applicationId);

  if (!input) {
    return { created: 0, first_due_date: null };
  }

  const anchor = toDateOnly(input.start_date);
  const dueDay = Number(anchor.slice(8, 10));
  const firstDue = nextDueAfter(anchor, dueDay);
  const base = {
    applicationId: Number(input.application_id),
    boarderId: Number(input.boarder_id),
    landlordId: Number(input.landlord_id),
    roomId: Number(input.room_id),
    propertyId: Number(input.property_id),
  };

  let created = 0;

  const deposit = roundMoney(Number(input.room_deposit));
  if (deposit > 0) {
    created += await insertCharge(db, {
      ...base,
      chargeType: 'deposit',
      amount: deposit,
      dueDate: anchor,
      description: 'Security deposit',
      generationKey: `deposit:${base.applicationId}`,
    });
  }

  const rent = roundMoney(Number(input.room_price));
  const explicitAdvance = roundMoney(Number(input.advance_amount));
  const advance =
    explicitAdvance > 0 ? explicitAdvance : parseAdvanceAmount(input.property_advance, rent);

  if (advance > 0) {
    created += await insertCharge(db, {
      ...base,
      chargeType: 'advance',
      amount: advance,
      dueDate: anchor,
      description: 'Advance payment',
      generationKey: `advance:${base.applicationId}`,
    });
  }

  if (rent > 0) {
    created += await insertRentMonths(db, {
      anchor,
      dueDay,
      firstDue,
      months: horizonMonths,
      amount: rent,
      base,
    });

    await db
      .prepare(
        `
          UPDATE applications
          SET next_due_date = COALESCE(next_due_date, ?), updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status = 'confirmed' AND deleted_at IS NULL
        `
      )
      .bind(firstDue, base.applicationId)
      .run();
  }

  return { created, first_due_date: firstDue };
}

async function insertRentMonths(
  db: D1Database,
  data: {
    anchor: string;
    dueDay: number;
    firstDue: string;
    months: number;
    amount: number;
    base: {
      applicationId: number;
      boarderId: number;
      landlordId: number;
      roomId: number;
      propertyId: number;
    };
  }
): Promise<number> {
  let created = 0;

  for (let index = 0; index < data.months; index += 1) {
    const dueDate =
      index === 0 ? data.firstDue : addMonthsClamped(data.firstDue, index, data.dueDay);
    const periodStart =
      index === 0 ? data.anchor : addMonthsClamped(data.firstDue, index - 1, data.dueDay);

    created += await insertCharge(db, {
      ...data.base,
      chargeType: 'rent',
      amount: data.amount,
      dueDate,
      description: `Monthly rent — ${monthLabel(dueDate)}`,
      periodStart,
      periodEnd: dueDate,
      generationKey: `rent:${data.base.applicationId}:${dueDate}`,
    });
  }

  return created;
}
