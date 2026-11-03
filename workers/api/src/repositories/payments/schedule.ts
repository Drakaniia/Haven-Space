import {
  DEFAULT_HORIZON_MONTHS,
  addMonthsClamped,
  nextDueAfter,
  previousDay,
  roundMoney,
  toDateOnly,
} from './helpers';

/**
 * Schedule generation (spec `payments-feature` §6.1).
 *
 * On (or after) booking confirmation a tenancy gets its charges: one deposit,
 * one advance (only when the landlord captured an amount), and `horizonMonths`
 * months of rent. Every insert carries a `generation_key`, and the partial
 * unique index on that column makes re-running any part of this a no-op.
 */

export interface ScheduleInputRow {
  application_id: number;
  boarder_id: number;
  landlord_id: number;
  room_id: number;
  property_id: number;
  room_price: number | string;
  room_deposit: number | string;
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

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function monthLabel(date: string): string {
  const [year, month] = toDateOnly(date).split('-').map(Number);

  return `${MONTH_LABELS[month - 1] ?? month} ${year}`;
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
          COALESCE(app.advance_amount, 0) AS advance_amount,
          COALESCE(app.confirmed_at, app.created_at) AS start_date
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
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
      dueDate: firstDue,
      description: 'Security deposit',
      generationKey: `deposit:${base.applicationId}`,
    });
  }

  const advance = roundMoney(Number(input.advance_amount));
  if (advance > 0) {
    created += await insertCharge(db, {
      ...base,
      chargeType: 'advance',
      amount: advance,
      dueDate: firstDue,
      description: 'Advance payment',
      generationKey: `advance:${base.applicationId}`,
    });
  }

  const rent = roundMoney(Number(input.room_price));
  if (rent > 0) {
    created += await insertRentMonths(db, {
      input,
      dueDay,
      firstDue,
      months: horizonMonths,
      amount: rent,
      base,
    });
  }

  return { created, first_due_date: firstDue };
}

async function insertRentMonths(
  db: D1Database,
  data: {
    input: ScheduleInputRow;
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
    const nextDue = addMonthsClamped(data.firstDue, index + 1, data.dueDay);

    created += await insertCharge(db, {
      ...data.base,
      chargeType: 'rent',
      amount: data.amount,
      dueDate,
      description: `Monthly rent — ${monthLabel(dueDate)}`,
      periodStart: dueDate,
      periodEnd: previousDay(nextDue),
      generationKey: `rent:${data.base.applicationId}:${dueDate}`,
    });
  }

  return created;
}

interface ExtensionRow {
  application_id: number;
  last_due: string | null;
}

/**
 * Keeps every confirmed tenancy billed out to the rolling horizon. Called by the
 * nightly job so a ledger is never empty after the initial 3 months.
 */
export async function extendSchedulesForActiveTenancies(
  db: D1Database,
  horizonMonths: number = DEFAULT_HORIZON_MONTHS,
  today: string
): Promise<number> {
  const rows = await db
    .prepare(
      `
        SELECT
          app.id AS application_id,
          (
            SELECT MAX(p.due_date)
            FROM payments p
            WHERE p.application_id = app.id
              AND p.charge_type = 'rent'
              AND p.generation_key IS NOT NULL
          ) AS last_due
        FROM applications app
        WHERE app.status = 'confirmed'
          AND app.deleted_at IS NULL
      `
    )
    .bind()
    .all<ExtensionRow>();

  const horizonEnd = addMonthsClamped(today, horizonMonths);
  let created = 0;

  for (const row of rows.results ?? []) {
    const applicationId = Number(row.application_id);

    if (!row.last_due) {
      const result = await generateScheduleForApplication(db, applicationId, { horizonMonths });
      created += result.created;
      continue;
    }

    const input = await findScheduleInput(db, applicationId);

    if (!input) {
      continue;
    }

    const dueDay = Number(toDateOnly(input.start_date).slice(8, 10));
    const rent = roundMoney(Number(input.room_price));
    let lastDue = toDateOnly(row.last_due);
    let guard = 0;

    while (lastDue < horizonEnd && guard < 24) {
      lastDue = addMonthsClamped(lastDue, 1, dueDay);
      const nextDue = addMonthsClamped(lastDue, 1, dueDay);

      created += await insertCharge(db, {
        applicationId,
        boarderId: Number(input.boarder_id),
        landlordId: Number(input.landlord_id),
        roomId: Number(input.room_id),
        propertyId: Number(input.property_id),
        chargeType: 'rent',
        amount: rent,
        dueDate: lastDue,
        description: `Monthly rent — ${monthLabel(lastDue)}`,
        periodStart: lastDue,
        periodEnd: previousDay(nextDue),
        generationKey: `rent:${applicationId}:${lastDue}`,
      });
      guard += 1;
    }
  }

  return created;
}
