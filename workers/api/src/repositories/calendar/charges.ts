import { manilaMidnight } from './helpers';
import { LINKS, type CalendarFamily, type CalendarParty } from './types';
import {
  DEFAULT_GRACE_DAYS,
  addDays,
  daysBetween,
  isDueSoon,
  roundMoney,
  toDateOnly,
} from '../payments/helpers';
import { formatCharge, type ChargeRow } from '../payments/types';
import { accessiblePropertyClause } from '../property-access/helpers';
import { manilaDateOf, partyName, roomLabel, toIsoTimestamp, inWindow } from './helpers';
import type { CalendarEvent, CalendarQuery } from './types';

/* ------------------------------------------------------------- queries ------- */

const CHARGE_CALENDAR_SELECT = `
  pay.*,
  pr.title AS property_title,
  COALESCE(pr.late_fee_grace_days, ${DEFAULT_GRACE_DAYS}) AS grace_days,
  COALESCE(r.room_number, r.title) AS room_title,
  u.first_name AS boarder_first_name,
  u.last_name AS boarder_last_name
`;

export async function listChargeEvents(
  db: D1Database,
  landlordId: number,
  query: CalendarQuery,
  referenceDate: string
): Promise<CalendarEvent[]> {
  const clauses = [
    'pr.deleted_at IS NULL',
    accessiblePropertyClause('pr'),
    "pay.status <> 'cancelled'",
    `((pay.due_date >= ? AND pay.due_date < ?) OR (pay.paid_date IS NOT NULL AND pay.paid_date >= ? AND pay.paid_date < ?))`,
  ];
  const binds: unknown[] = [landlordId, landlordId, query.from, query.to, query.from, query.to];

  if (query.propertyId) {
    clauses.push('pay.property_id = ?');
    binds.push(query.propertyId);
  }

  const result = await db
    .prepare(
      `
        SELECT ${CHARGE_CALENDAR_SELECT}
        FROM payments pay
        JOIN properties pr ON pay.property_id = pr.id
        LEFT JOIN rooms r ON pay.room_id = r.id
        LEFT JOIN users u ON pay.boarder_id = u.id
        WHERE ${clauses.join(' AND ')}
        ORDER BY pay.due_date ASC, pay.id ASC
      `
    )
    .bind(...binds)
    .all<ChargeRow>();

  const events: CalendarEvent[] = [];

  for (const row of result.results ?? []) {
    // The ledger's own derivation — the calendar and `/landlord/payments` can
    // never disagree about whether a charge is overdue (spec §3.4/D6).
    const charge = formatCharge(row, referenceDate, []);
    const subject = charge.boarder_name ?? `Boarder ${charge.boarder_id}`;
    const boarder: CalendarParty | null = charge.boarder_name
      ? { id: charge.boarder_id, name: charge.boarder_name }
      : null;
    const shared = {
      family: 'money' as CalendarFamily,
      amount: charge.total_due,
      late_fee: charge.late_fee,
      charge_type: charge.charge_type,
      description: charge.description,
      period_start: charge.period_start,
      period_end: charge.period_end,
      boarder,
      room: { id: charge.room_id, name: charge.room_title ?? '' },
      property: { id: charge.property_id, name: charge.property_title ?? '' },
      application_id: null,
      leave_request: null,
    };

    if (inWindow(charge.due_date, query.from, query.to)) {
      events.push({
        ...shared,
        id: `charge:${charge.id}:charge_due`,
        type: 'charge_due',
        date: charge.due_date,
        occurred_at: manilaMidnight(charge.due_date),
        subject,
        status:
          charge.status === 'pending' && isDueSoon(charge.due_date, referenceDate)
            ? 'due_soon'
            : charge.status,
        approximate: false,
        reference_number: charge.reference_number,
        link: LINKS.charge_due,
      });
    }

    if (inWindow(charge.paid_date, query.from, query.to) && charge.paid_date) {
      events.push({
        ...shared,
        id: `charge:${charge.id}:payment_received`,
        type: 'payment_received',
        date: toDateOnly(charge.paid_date),
        occurred_at: toIsoTimestamp(row.updated_at, charge.paid_date),
        subject,
        status: 'paid',
        approximate: false,
        reference_number: charge.reference_number,
        link: LINKS.payment_received,
      });
    }
  }

  return events;
}
