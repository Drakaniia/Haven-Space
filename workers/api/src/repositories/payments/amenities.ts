import { accessiblePropertyClause } from '../property-access/helpers';
import {
  addDays,
  addMonthsClamped,
  dueDateFor,
  effectiveStatus,
  manilaToday,
  roundMoney,
  toDateOnly,
} from './helpers';
import { insertNotification } from './notify';

export type AmenityBillingModel = 'monthly' | 'per_use' | 'one_time';

export interface PaidAmenityDto {
  id: number;
  property_id: number;
  name: string;
  description: string | null;
  icon: string;
  billing_model: AmenityBillingModel;
  price: number;
  unit_label: string;
  is_metered: boolean;
  is_included: boolean;
  max_slots: number | null;
  active_slots: number;
  allow_boarder_request: boolean;
  is_active: boolean;
  created_at: string;
}

export interface TenancyAmenityDto {
  id: number;
  paid_amenity_id: number;
  amenity_name: string;
  amenity_icon: string;
  unit_label: string;
  application_id: number;
  property_id: number;
  boarder_id: number;
  boarder_name: string;
  room_id: number;
  room_title: string;
  status: string;
  quantity: number;
  unit_price_snapshot: number;
  billing_model_snapshot: AmenityBillingModel;
  next_bill_date: string | null;
  last_billed_date: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface AmenityUsageLogDto {
  id: number;
  paid_amenity_id: number;
  amenity_name: string;
  unit_label: string;
  is_metered: boolean;
  application_id: number;
  property_id: number;
  boarder_id: number;
  boarder_name: string;
  room_title: string;
  payment_id: number | null;
  payment_status: string | null;
  status: string;
  quantity: number;
  unit_price_snapshot: number;
  previous_reading: number | null;
  current_reading: number | null;
  total_amount: number;
  usage_date: string;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface AmenityBoarderSummary {
  application_id: number;
  boarder_id: number;
  boarder_name: string;
  room_id: number;
  room_title: string;
}

export interface CreatePaidAmenityInput {
  name: string;
  description?: string | null;
  icon?: string;
  billing_model: AmenityBillingModel;
  price: number;
  unit_label?: string;
  is_metered?: boolean;
  is_included?: boolean;
  max_slots?: number | null;
  allow_boarder_request?: boolean;
}

export class AmenityRuleError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const PROPERTY_ACCESS = `(${accessiblePropertyClause()})`;

interface CatalogRow {
  id: number;
  property_id: number;
  name: string;
  description: string | null;
  icon: string;
  billing_model: string;
  price: number | string;
  unit_label: string;
  is_metered: number;
  is_included: number;
  max_slots: number | null;
  allow_boarder_request: number;
  is_active: number;
  active_slots: number | string;
  created_at: string;
}

interface TenancyAmenityRow {
  id: number;
  paid_amenity_id: number;
  amenity_name: string;
  amenity_icon: string;
  unit_label: string;
  application_id: number;
  property_id: number;
  boarder_id: number;
  boarder_name: string;
  room_id: number;
  room_title: string;
  status: string;
  quantity: number;
  unit_price_snapshot: number | string;
  billing_model_snapshot: string;
  next_bill_date: string | null;
  last_billed_date: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
}

interface UsageLogRow {
  id: number;
  paid_amenity_id: number;
  amenity_name: string;
  unit_label: string;
  is_metered: number;
  application_id: number;
  property_id: number;
  boarder_id: number;
  boarder_name: string;
  room_title: string;
  payment_id: number | null;
  payment_stored_status: string | null;
  payment_due_date: string | null;
  grace_days: number | null;
  status: string;
  quantity: number | string;
  unit_price_snapshot: number | string;
  previous_reading: number | string | null;
  current_reading: number | string | null;
  total_amount: number | string;
  usage_date: string;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
}

interface ActiveTenancyRow {
  application_id: number;
  boarder_id: number;
  landlord_id: number;
  property_id: number;
  property_title: string;
  room_id: number;
  room_title: string;
  boarder_name: string;
  next_due_date: string | null;
  created_at: string;
}

function formatCatalog(row: CatalogRow): PaidAmenityDto {
  return {
    id: Number(row.id),
    property_id: Number(row.property_id),
    name: row.name,
    description: row.description ?? null,
    icon: row.icon || 'sparkles',
    billing_model: row.billing_model as AmenityBillingModel,
    price: roundMoney(Number(row.price ?? 0)),
    unit_label: row.unit_label || 'unit',
    is_metered: Number(row.is_metered ?? 0) === 1,
    is_included: Number(row.is_included ?? 0) === 1,
    max_slots: row.max_slots !== null && row.max_slots !== undefined ? Number(row.max_slots) : null,
    active_slots: Number(row.active_slots ?? 0),
    allow_boarder_request: Number(row.allow_boarder_request ?? 1) === 1,
    is_active: Number(row.is_active ?? 1) === 1,
    created_at: row.created_at,
  };
}

function formatSubscription(row: TenancyAmenityRow): TenancyAmenityDto {
  return {
    id: Number(row.id),
    paid_amenity_id: Number(row.paid_amenity_id),
    amenity_name: row.amenity_name,
    amenity_icon: row.amenity_icon || 'sparkles',
    unit_label: row.unit_label || 'unit',
    application_id: Number(row.application_id),
    property_id: Number(row.property_id),
    boarder_id: Number(row.boarder_id),
    boarder_name: row.boarder_name || 'Boarder',
    room_id: Number(row.room_id),
    room_title: row.room_title || 'Room',
    status: row.status,
    quantity: Number(row.quantity ?? 1),
    unit_price_snapshot: roundMoney(Number(row.unit_price_snapshot ?? 0)),
    billing_model_snapshot: row.billing_model_snapshot as AmenityBillingModel,
    next_bill_date: row.next_bill_date ?? null,
    last_billed_date: row.last_billed_date ?? null,
    notes: row.notes ?? null,
    rejection_reason: row.rejection_reason ?? null,
    created_at: row.created_at,
  };
}

function formatUsageLog(row: UsageLogRow, today: string): AmenityUsageLogDto {
  const paymentStatus = row.payment_stored_status
    ? effectiveStatus(
        row.payment_stored_status,
        row.payment_due_date ?? today,
        Number(row.grace_days ?? 3),
        today
      )
    : null;

  return {
    id: Number(row.id),
    paid_amenity_id: Number(row.paid_amenity_id),
    amenity_name: row.amenity_name,
    unit_label: row.unit_label || 'unit',
    is_metered: Number(row.is_metered ?? 0) === 1,
    application_id: Number(row.application_id),
    property_id: Number(row.property_id),
    boarder_id: Number(row.boarder_id),
    boarder_name: row.boarder_name || 'Boarder',
    room_title: row.room_title || 'Room',
    payment_id: row.payment_id ? Number(row.payment_id) : null,
    payment_status: paymentStatus,
    status: row.status,
    quantity: roundMoney(Number(row.quantity ?? 0)),
    unit_price_snapshot: roundMoney(Number(row.unit_price_snapshot ?? 0)),
    previous_reading:
      row.previous_reading !== null && row.previous_reading !== undefined
        ? roundMoney(Number(row.previous_reading))
        : null,
    current_reading:
      row.current_reading !== null && row.current_reading !== undefined
        ? roundMoney(Number(row.current_reading))
        : null,
    total_amount: roundMoney(Number(row.total_amount ?? 0)),
    usage_date: row.usage_date,
    notes: row.notes ?? null,
    rejection_reason: row.rejection_reason ?? null,
    created_at: row.created_at,
  };
}

function anchorDayForTenancy(tenancy: Pick<ActiveTenancyRow, 'next_due_date' | 'created_at'>): number {
  const dateStr = toDateOnly(tenancy.next_due_date || tenancy.created_at) || manilaToday();
  const day = Number(dateStr.split('-')[2]);

  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : 1;
}

/** First rent-aligned billing date strictly > today + 14 days so mid-cycle activation is not double-billed. */
export function nextClampedMonthlyBillDate(anchorDay: number, today: string): string {
  const threshold = addDays(today, 14);
  const [year, month] = today.split('-').map(Number);

  for (let offset = 0; offset <= 2; offset += 1) {
    const candidate = dueDateFor(year, month + offset, anchorDay);

    if (candidate > threshold) {
      return candidate;
    }
  }

  return addMonthsClamped(today, 1, anchorDay);
}

async function activeSlotsUsed(db: D1Database, paidAmenityId: number): Promise<number> {
  const row = await db
    .prepare(
      `
        SELECT COALESCE(SUM(quantity), 0) AS used
        FROM tenancy_amenities
        WHERE paid_amenity_id = ?
          AND status = 'active'
      `
    )
    .bind(paidAmenityId)
    .first<{ used: number | string }>();

  return Number(row?.used ?? 0);
}

async function assertSlotCapacity(
  db: D1Database,
  paidAmenityId: number,
  maxSlots: number | null,
  requestedQuantity: number
): Promise<void> {
  if (maxSlots === null) {
    return;
  }

  const used = await activeSlotsUsed(db, paidAmenityId);

  if (used + requestedQuantity > maxSlots) {
    throw new AmenityRuleError(
      409,
      'amenity_slots_full',
      'Not enough available slots for this amenity'
    );
  }
}

async function insertAmenityCharge(
  db: D1Database,
  input: {
    boarderId: number;
    landlordId: number;
    roomId: number;
    propertyId: number;
    applicationId: number;
    amount: number;
    dueDate: string;
    description: string;
    generationKey?: string | null;
    createdBy: number;
    paidAmenityId: number;
    tenancyAmenityId?: number | null;
    amenityUsageLogId?: number | null;
  }
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO payments (
          boarder_id, landlord_id, room_id, property_id, application_id,
          charge_type, description, amount, due_date, status, generation_key,
          created_by, paid_amenity_id, tenancy_amenity_id, amenity_usage_log_id,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'amenity', ?, ?, ?, 'pending', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .bind(
      input.boarderId,
      input.landlordId,
      input.roomId,
      input.propertyId,
      input.applicationId,
      input.description,
      roundMoney(input.amount),
      toDateOnly(input.dueDate),
      input.generationKey ?? null,
      input.createdBy,
      input.paidAmenityId,
      input.tenancyAmenityId ?? null,
      input.amenityUsageLogId ?? null
    )
    .run();

  return Number(result.meta.last_row_id);
}

async function findCatalogItem(db: D1Database, amenityId: number): Promise<CatalogRow | null> {
  return await db
    .prepare(
      `
        SELECT
          pa.*,
          COALESCE((
            SELECT SUM(ta.quantity)
            FROM tenancy_amenities ta
            WHERE ta.paid_amenity_id = pa.id AND ta.status = 'active'
          ), 0) AS active_slots
        FROM paid_amenities pa
        WHERE pa.id = ?
      `
    )
    .bind(amenityId)
    .first<CatalogRow>();
}

async function findLandlordOwnedProperty(
  db: D1Database,
  propertyId: number,
  landlordId: number
): Promise<{ id: number; owner_id: number; title: string } | null> {
  return await db
    .prepare(
      `
        SELECT id, landlord_id AS owner_id, title
        FROM properties
        WHERE id = ?
          AND deleted_at IS NULL
          AND ${PROPERTY_ACCESS}
      `
    )
    .bind(propertyId, landlordId, landlordId)
    .first<{ id: number; owner_id: number; title: string }>();
}

async function findConfirmedTenancyByApplication(
  db: D1Database,
  applicationId: number,
  propertyId?: number
): Promise<ActiveTenancyRow | null> {
  return await db
    .prepare(
      `
        SELECT
          app.id AS application_id,
          app.boarder_id,
          p.landlord_id,
          p.id AS property_id,
          p.title AS property_title,
          app.room_id,
          COALESCE(r.room_number, r.title, 'Room') AS room_title,
          TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS boarder_name,
          app.next_due_date,
          app.created_at
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        JOIN users u ON app.boarder_id = u.id
        WHERE app.id = ?
          AND app.status = 'confirmed'
          AND app.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND p.deleted_at IS NULL
          ${propertyId ? 'AND p.id = ?' : ''}
        LIMIT 1
      `
    )
    .bind(...(propertyId ? [applicationId, propertyId] : [applicationId]))
    .first<ActiveTenancyRow>();
}

export async function findConfirmedTenancyForBoarder(
  db: D1Database,
  boarderId: number
): Promise<ActiveTenancyRow | null> {
  return await db
    .prepare(
      `
        SELECT
          app.id AS application_id,
          app.boarder_id,
          p.landlord_id,
          p.id AS property_id,
          p.title AS property_title,
          app.room_id,
          COALESCE(r.room_number, r.title, 'Room') AS room_title,
          TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS boarder_name,
          app.next_due_date,
          app.created_at
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        JOIN users u ON app.boarder_id = u.id
        WHERE app.boarder_id = ?
          AND app.status = 'confirmed'
          AND app.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND p.deleted_at IS NULL
        ORDER BY app.created_at DESC
        LIMIT 1
      `
    )
    .bind(boarderId)
    .first<ActiveTenancyRow>();
}

async function listCatalogForProperty(
  db: D1Database,
  propertyId: number,
  activeOnly = false
): Promise<PaidAmenityDto[]> {
  const rows = await db
    .prepare(
      `
        SELECT
          pa.*,
          COALESCE((
            SELECT SUM(ta.quantity)
            FROM tenancy_amenities ta
            WHERE ta.paid_amenity_id = pa.id AND ta.status = 'active'
          ), 0) AS active_slots
        FROM paid_amenities pa
        WHERE pa.property_id = ?
          ${activeOnly ? 'AND pa.is_active = 1' : ''}
        ORDER BY pa.is_active DESC, pa.name ASC
      `
    )
    .bind(propertyId)
    .all<CatalogRow>();

  return (rows.results ?? []).map(formatCatalog);
}

async function listSubscriptions(
  db: D1Database,
  whereClause: string,
  binds: unknown[]
): Promise<TenancyAmenityDto[]> {
  const rows = await db
    .prepare(
      `
        SELECT
          ta.*,
          pa.name AS amenity_name,
          pa.icon AS amenity_icon,
          pa.unit_label AS unit_label,
          TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS boarder_name,
          COALESCE(r.room_number, r.title, 'Room') AS room_title
        FROM tenancy_amenities ta
        JOIN paid_amenities pa ON ta.paid_amenity_id = pa.id
        JOIN users u ON ta.boarder_id = u.id
        JOIN rooms r ON ta.room_id = r.id
        WHERE ${whereClause}
        ORDER BY ta.created_at DESC, ta.id DESC
      `
    )
    .bind(...binds)
    .all<TenancyAmenityRow>();

  return (rows.results ?? []).map(formatSubscription);
}

async function listUsageLogs(
  db: D1Database,
  whereClause: string,
  binds: unknown[],
  today: string
): Promise<AmenityUsageLogDto[]> {
  const rows = await db
    .prepare(
      `
        SELECT
          ul.*,
          pa.name AS amenity_name,
          pa.unit_label AS unit_label,
          pa.is_metered AS is_metered,
          TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS boarder_name,
          COALESCE(r.room_number, r.title, 'Room') AS room_title,
          pay.status AS payment_stored_status,
          pay.due_date AS payment_due_date,
          pr.late_fee_grace_days AS grace_days
        FROM amenity_usage_logs ul
        JOIN paid_amenities pa ON ul.paid_amenity_id = pa.id
        JOIN applications app ON ul.application_id = app.id
        JOIN rooms r ON app.room_id = r.id
        JOIN users u ON ul.boarder_id = u.id
        LEFT JOIN payments pay ON ul.payment_id = pay.id
        LEFT JOIN properties pr ON ul.property_id = pr.id
        WHERE ${whereClause}
        ORDER BY ul.created_at DESC, ul.id DESC
        LIMIT 100
      `
    )
    .bind(...binds)
    .all<UsageLogRow>();

  return (rows.results ?? []).map(row => formatUsageLog(row, today));
}

export async function listLandlordPropertyAmenities(
  db: D1Database,
  propertyId: number,
  landlordId: number
) {
  const property = await findLandlordOwnedProperty(db, propertyId, landlordId);

  if (!property) {
    return null;
  }

  const today = manilaToday();
  const monthPrefix = today.slice(0, 7);
  const [catalog, subscriptions, usageLogs, boarderRows, monthTotals] = await Promise.all([
    listCatalogForProperty(db, propertyId, false),
    listSubscriptions(db, 'ta.property_id = ?', [propertyId]),
    listUsageLogs(db, 'ul.property_id = ?', [propertyId], today),
    db
      .prepare(
        `
          SELECT
            app.id AS application_id,
            app.boarder_id,
            TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS boarder_name,
            app.room_id,
            COALESCE(r.room_number, r.title, 'Room') AS room_title
          FROM applications app
          JOIN rooms r ON app.room_id = r.id
          JOIN users u ON app.boarder_id = u.id
          WHERE r.property_id = ?
            AND app.status = 'confirmed'
            AND app.deleted_at IS NULL
            AND u.deleted_at IS NULL
          ORDER BY room_title ASC, boarder_name ASC
        `
      )
      .bind(propertyId)
      .all<AmenityBoarderSummary>(),
    db
      .prepare(
        `
          SELECT
            COALESCE(SUM(amount), 0) AS billed,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS collected
          FROM payments
          WHERE property_id = ?
            AND charge_type = 'amenity'
            AND status <> 'cancelled'
            AND substr(due_date, 1, 7) = ?
        `
      )
      .bind(propertyId, monthPrefix)
      .first<{ billed: number | string; collected: number | string }>(),
  ]);

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const pendingSubscriptions = subscriptions.filter(s => s.status === 'pending_approval');
  const pendingUsage = usageLogs.filter(u => u.status === 'pending_approval');
  const monthlyRecurring = roundMoney(
    activeSubscriptions
      .filter(s => s.billing_model_snapshot === 'monthly')
      .reduce((sum, s) => sum + s.unit_price_snapshot * s.quantity, 0)
  );

  return {
    property: { id: Number(property.id), title: property.title },
    catalog,
    subscriptions,
    pending_requests: {
      subscriptions: pendingSubscriptions,
      usage: pendingUsage,
    },
    usage_logs: usageLogs,
    boarders: (boarderRows.results ?? []).map(row => ({
      application_id: Number(row.application_id),
      boarder_id: Number(row.boarder_id),
      boarder_name: row.boarder_name || 'Boarder',
      room_id: Number(row.room_id),
      room_title: row.room_title || 'Room',
    })),
    summary: {
      active_catalog_count: catalog.filter(c => c.is_active).length,
      monthly_recurring_revenue: monthlyRecurring,
      pending_requests_count: pendingSubscriptions.length + pendingUsage.length,
      month_billed: roundMoney(Number(monthTotals?.billed ?? 0)),
      month_collected: roundMoney(Number(monthTotals?.collected ?? 0)),
    },
  };
}

export async function createPaidAmenities(
  db: D1Database,
  propertyId: number,
  landlordId: number,
  items: CreatePaidAmenityInput[]
): Promise<PaidAmenityDto[] | null> {
  const property = await findLandlordOwnedProperty(db, propertyId, landlordId);

  if (!property) {
    return null;
  }

  const createdIds: number[] = [];

  for (const item of items) {
    const isIncluded = Boolean(item.is_included);
    const price = isIncluded ? 0 : roundMoney(Math.max(item.price, 0));
    const isMetered = item.billing_model === 'per_use' && Boolean(item.is_metered) ? 1 : 0;
    const result = await db
      .prepare(
        `
          INSERT INTO paid_amenities (
            property_id, name, description, icon, billing_model, price,
            unit_label, is_metered, is_included, max_slots, allow_boarder_request,
            is_active, created_by, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `
      )
      .bind(
        propertyId,
        item.name,
        item.description ?? null,
        item.icon || 'sparkles',
        item.billing_model,
        price,
        item.unit_label || 'unit',
        isMetered,
        isIncluded ? 1 : 0,
        item.max_slots ?? null,
        item.allow_boarder_request === false ? 0 : 1,
        landlordId
      )
      .run();

    createdIds.push(Number(result.meta.last_row_id));
  }

  const all = await listCatalogForProperty(db, propertyId, false);
  const createdSet = new Set(createdIds);

  return all.filter(row => createdSet.has(row.id));
}

export async function updatePaidAmenity(
  db: D1Database,
  amenityId: number,
  landlordId: number,
  patch: Partial<CreatePaidAmenityInput> & { is_active?: boolean }
): Promise<PaidAmenityDto | null> {
  const existing = await findCatalogItem(db, amenityId);

  if (!existing) {
    return null;
  }

  const property = await findLandlordOwnedProperty(db, Number(existing.property_id), landlordId);

  if (!property) {
    return null;
  }

  const billingModel = (patch.billing_model ?? existing.billing_model) as AmenityBillingModel;
  const isIncluded =
    patch.is_included !== undefined ? patch.is_included : Number(existing.is_included) === 1;
  const price = isIncluded
    ? 0
    : roundMoney(Math.max(patch.price ?? Number(existing.price), 0));
  const isMetered =
    billingModel === 'per_use' &&
    (patch.is_metered !== undefined ? patch.is_metered : Number(existing.is_metered) === 1)
      ? 1
      : 0;
  const maxSlots = patch.max_slots !== undefined ? patch.max_slots : existing.max_slots;
  const allowBoarderRequest =
    patch.allow_boarder_request !== undefined
      ? patch.allow_boarder_request
        ? 1
        : 0
      : Number(existing.allow_boarder_request);
  const isActive =
    patch.is_active !== undefined ? (patch.is_active ? 1 : 0) : Number(existing.is_active);

  await db
    .prepare(
      `
        UPDATE paid_amenities
        SET name = ?,
            description = ?,
            icon = ?,
            billing_model = ?,
            price = ?,
            unit_label = ?,
            is_metered = ?,
            is_included = ?,
            max_slots = ?,
            allow_boarder_request = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(
      patch.name ?? existing.name,
      patch.description !== undefined ? patch.description : existing.description,
      patch.icon ?? existing.icon,
      billingModel,
      price,
      patch.unit_label ?? existing.unit_label,
      isMetered,
      isIncluded ? 1 : 0,
      maxSlots,
      allowBoarderRequest,
      isActive,
      amenityId
    )
    .run();

  const updated = await findCatalogItem(db, amenityId);

  return updated ? formatCatalog(updated) : null;
}

async function activateSubscriptionAndBill(
  db: D1Database,
  opts: {
    subscriptionId: number;
    catalog: CatalogRow;
    tenancy: ActiveTenancyRow;
    quantity: number;
    unitPrice: number;
    actorId: number;
    dueDate: string;
    notifyType: 'amenity_approved' | 'amenity_assigned';
  }
): Promise<TenancyAmenityDto> {
  const today = manilaToday();
  const model = opts.catalog.billing_model as AmenityBillingModel;
  const total = roundMoney(opts.unitPrice * opts.quantity);
  const qtySuffix = opts.quantity > 1 ? ` (×${opts.quantity})` : '';

  if (model === 'monthly') {
    const anchorDay = anchorDayForTenancy(opts.tenancy);
    const nextBill = nextClampedMonthlyBillDate(anchorDay, today);

    await db
      .prepare(
        `
          UPDATE tenancy_amenities
          SET status = 'active',
              anchor_day = ?,
              next_bill_date = ?,
              last_billed_date = ?,
              approved_by = ?,
              approved_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      )
      .bind(anchorDay, nextBill, today, opts.actorId, opts.subscriptionId)
      .run();

    if (total > 0) {
      await insertAmenityCharge(db, {
        boarderId: Number(opts.tenancy.boarder_id),
        landlordId: Number(opts.tenancy.landlord_id),
        roomId: Number(opts.tenancy.room_id),
        propertyId: Number(opts.tenancy.property_id),
        applicationId: Number(opts.tenancy.application_id),
        amount: total,
        dueDate: opts.dueDate,
        description: `${opts.catalog.name}${qtySuffix} — Initial month`,
        generationKey: `amenity_init:${opts.subscriptionId}`,
        createdBy: opts.actorId,
        paidAmenityId: Number(opts.catalog.id),
        tenancyAmenityId: opts.subscriptionId,
      });
    }
  } else {
    await db
      .prepare(
        `
          UPDATE tenancy_amenities
          SET status = 'completed',
              approved_by = ?,
              approved_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      )
      .bind(opts.actorId, opts.subscriptionId)
      .run();

    if (total > 0) {
      await insertAmenityCharge(db, {
        boarderId: Number(opts.tenancy.boarder_id),
        landlordId: Number(opts.tenancy.landlord_id),
        roomId: Number(opts.tenancy.room_id),
        propertyId: Number(opts.tenancy.property_id),
        applicationId: Number(opts.tenancy.application_id),
        amount: total,
        dueDate: opts.dueDate,
        description: `${opts.catalog.name}${qtySuffix}`,
        generationKey: `amenity_once:${opts.subscriptionId}`,
        createdBy: opts.actorId,
        paidAmenityId: Number(opts.catalog.id),
        tenancyAmenityId: opts.subscriptionId,
      });
    }
  }

  await insertNotification(db, {
    userId: Number(opts.tenancy.boarder_id),
    type: opts.notifyType,
    title:
      opts.notifyType === 'amenity_approved'
        ? `Amenity approved: ${opts.catalog.name}`
        : `Amenity added: ${opts.catalog.name}`,
    message:
      total > 0
        ? `${opts.catalog.name}${qtySuffix} (₱${total.toLocaleString()}) is active. Due ${opts.dueDate}.`
        : `${opts.catalog.name}${qtySuffix} is now active on your tenancy.`,
    metadata: {
      tenancy_amenity_id: opts.subscriptionId,
      paid_amenity_id: Number(opts.catalog.id),
      amount: total,
    },
  });

  const rows = await listSubscriptions(db, 'ta.id = ?', [opts.subscriptionId]);

  return rows[0];
}

export async function assignTenancyAmenity(
  db: D1Database,
  propertyId: number,
  amenityId: number,
  landlordId: number,
  input: { application_id: number; quantity?: number; due_date?: string | null; notes?: string | null }
): Promise<TenancyAmenityDto> {
  const property = await findLandlordOwnedProperty(db, propertyId, landlordId);

  if (!property) {
    throw new AmenityRuleError(404, 'not_found', 'Property not found');
  }

  const catalog = await findCatalogItem(db, amenityId);

  if (!catalog || Number(catalog.property_id) !== propertyId) {
    throw new AmenityRuleError(404, 'not_found', 'Amenity not found');
  }

  if (catalog.billing_model === 'per_use') {
    throw new AmenityRuleError(400, 'invalid_model', 'Use usage logging for per-use amenities');
  }

  const tenancy = await findConfirmedTenancyByApplication(db, input.application_id, propertyId);

  if (!tenancy) {
    throw new AmenityRuleError(404, 'tenancy_not_found', 'Active confirmed tenancy not found');
  }

  const quantity = Math.min(Math.max(Math.round(input.quantity ?? 1), 1), 20);

  await assertSlotCapacity(
    db,
    amenityId,
    catalog.max_slots !== null ? Number(catalog.max_slots) : null,
    quantity
  );

  const unitPrice = roundMoney(Number(catalog.price ?? 0));
  const dueDate = input.due_date ?? addDays(manilaToday(), 3);
  const insert = await db
    .prepare(
      `
        INSERT INTO tenancy_amenities (
          paid_amenity_id, application_id, property_id, boarder_id, room_id,
          status, quantity, unit_price_snapshot, billing_model_snapshot, notes,
          requested_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'pending_approval', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .bind(
      amenityId,
      tenancy.application_id,
      propertyId,
      tenancy.boarder_id,
      tenancy.room_id,
      quantity,
      unitPrice,
      catalog.billing_model,
      input.notes ?? null,
      landlordId
    )
    .run();

  return await activateSubscriptionAndBill(db, {
    subscriptionId: Number(insert.meta.last_row_id),
    catalog,
    tenancy,
    quantity,
    unitPrice,
    actorId: landlordId,
    dueDate,
    notifyType: 'amenity_assigned',
  });
}

export async function approveTenancyAmenity(
  db: D1Database,
  subscriptionId: number,
  landlordId: number,
  dueDateOverride?: string | null
): Promise<TenancyAmenityDto> {
  const row = await db
    .prepare('SELECT * FROM tenancy_amenities WHERE id = ?')
    .bind(subscriptionId)
    .first<{
      id: number;
      paid_amenity_id: number;
      application_id: number;
      property_id: number;
      status: string;
      quantity: number;
      unit_price_snapshot: number | string;
    }>();

  if (!row) {
    throw new AmenityRuleError(404, 'not_found', 'Request not found');
  }

  const property = await findLandlordOwnedProperty(db, Number(row.property_id), landlordId);

  if (!property) {
    throw new AmenityRuleError(404, 'not_found', 'Request not found');
  }

  if (row.status !== 'pending_approval') {
    throw new AmenityRuleError(409, 'already_reviewed', 'Request has already been reviewed');
  }

  const catalog = await findCatalogItem(db, Number(row.paid_amenity_id));
  const tenancy = await findConfirmedTenancyByApplication(db, Number(row.application_id));

  if (!catalog || !tenancy) {
    throw new AmenityRuleError(409, 'tenancy_inactive', 'Tenancy or amenity is no longer active');
  }

  await assertSlotCapacity(
    db,
    Number(catalog.id),
    catalog.max_slots !== null ? Number(catalog.max_slots) : null,
    Number(row.quantity)
  );

  return await activateSubscriptionAndBill(db, {
    subscriptionId,
    catalog,
    tenancy,
    quantity: Number(row.quantity),
    unitPrice: roundMoney(Number(row.unit_price_snapshot)),
    actorId: landlordId,
    dueDate: dueDateOverride ?? addDays(manilaToday(), 3),
    notifyType: 'amenity_approved',
  });
}

export async function rejectTenancyAmenity(
  db: D1Database,
  subscriptionId: number,
  landlordId: number,
  reason?: string | null
): Promise<TenancyAmenityDto> {
  const row = await db
    .prepare(
      `
        SELECT ta.id, ta.property_id, ta.boarder_id, ta.status, pa.name AS amenity_name
        FROM tenancy_amenities ta
        JOIN paid_amenities pa ON ta.paid_amenity_id = pa.id
        WHERE ta.id = ?
      `
    )
    .bind(subscriptionId)
    .first<{
      id: number;
      property_id: number;
      boarder_id: number;
      status: string;
      amenity_name: string;
    }>();

  if (!row || !(await findLandlordOwnedProperty(db, Number(row.property_id), landlordId))) {
    throw new AmenityRuleError(404, 'not_found', 'Request not found');
  }

  if (row.status !== 'pending_approval') {
    throw new AmenityRuleError(409, 'already_reviewed', 'Request has already been reviewed');
  }

  await db
    .prepare(
      `
        UPDATE tenancy_amenities
        SET status = 'rejected',
            rejection_reason = ?,
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(reason || null, landlordId, subscriptionId)
    .run();

  await insertNotification(db, {
    userId: Number(row.boarder_id),
    type: 'amenity_rejected',
    title: `Amenity request declined: ${row.amenity_name}`,
    message: reason
      ? `Your request for ${row.amenity_name} was declined: ${reason}`
      : `Your request for ${row.amenity_name} was declined by your landlord.`,
    metadata: { tenancy_amenity_id: subscriptionId },
  });

  const rows = await listSubscriptions(db, 'ta.id = ?', [subscriptionId]);

  return rows[0];
}

export async function updateTenancyAmenity(
  db: D1Database,
  subscriptionId: number,
  landlordId: number,
  patch: { unit_price_snapshot?: number; quantity?: number }
): Promise<TenancyAmenityDto> {
  const row = await db
    .prepare('SELECT * FROM tenancy_amenities WHERE id = ?')
    .bind(subscriptionId)
    .first<{
      id: number;
      paid_amenity_id: number;
      property_id: number;
      status: string;
      quantity: number;
      unit_price_snapshot: number | string;
    }>();

  if (!row || !(await findLandlordOwnedProperty(db, Number(row.property_id), landlordId))) {
    throw new AmenityRuleError(404, 'not_found', 'Subscription not found');
  }

  if (row.status !== 'active') {
    throw new AmenityRuleError(409, 'not_active', 'Only active subscriptions can be updated');
  }

  const nextQty =
    patch.quantity !== undefined ? Math.min(Math.max(Math.round(patch.quantity), 1), 20) : row.quantity;
  const delta = nextQty - Number(row.quantity);

  if (delta > 0) {
    const catalog = await findCatalogItem(db, Number(row.paid_amenity_id));

    if (catalog) {
      await assertSlotCapacity(
        db,
        Number(catalog.id),
        catalog.max_slots !== null ? Number(catalog.max_slots) : null,
        delta
      );
    }
  }

  const nextPrice =
    patch.unit_price_snapshot !== undefined
      ? roundMoney(Math.max(patch.unit_price_snapshot, 0))
      : roundMoney(Number(row.unit_price_snapshot));

  await db
    .prepare(
      `
        UPDATE tenancy_amenities
        SET quantity = ?, unit_price_snapshot = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(nextQty, nextPrice, subscriptionId)
    .run();

  const rows = await listSubscriptions(db, 'ta.id = ?', [subscriptionId]);

  return rows[0];
}

export async function cancelTenancyAmenity(
  db: D1Database,
  subscriptionId: number,
  actor: { role: 'landlord' | 'boarder'; userId: number }
): Promise<TenancyAmenityDto> {
  const row = await db
    .prepare('SELECT id, property_id, boarder_id, status FROM tenancy_amenities WHERE id = ?')
    .bind(subscriptionId)
    .first<{ id: number; property_id: number; boarder_id: number; status: string }>();

  if (!row) {
    throw new AmenityRuleError(404, 'not_found', 'Subscription not found');
  }

  if (actor.role === 'boarder' && Number(row.boarder_id) !== actor.userId) {
    throw new AmenityRuleError(404, 'not_found', 'Subscription not found');
  }

  if (
    actor.role === 'landlord' &&
    !(await findLandlordOwnedProperty(db, Number(row.property_id), actor.userId))
  ) {
    throw new AmenityRuleError(404, 'not_found', 'Subscription not found');
  }

  if (row.status !== 'active' && row.status !== 'pending_approval') {
    throw new AmenityRuleError(409, 'cannot_cancel', 'Subscription is already closed');
  }

  await db
    .prepare(
      `
        UPDATE tenancy_amenities
        SET status = 'cancelled',
            cancelled_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(subscriptionId)
    .run();

  const rows = await listSubscriptions(db, 'ta.id = ?', [subscriptionId]);

  return rows[0];
}

export async function logAmenityUsage(
  db: D1Database,
  propertyId: number,
  amenityId: number,
  landlordId: number,
  input: {
    application_ids: number[];
    quantity?: number | null;
    previous_reading?: number | null;
    current_reading?: number | null;
    due_date?: string | null;
    usage_date?: string | null;
    notes?: string | null;
  }
): Promise<AmenityUsageLogDto[]> {
  const property = await findLandlordOwnedProperty(db, propertyId, landlordId);

  if (!property) {
    throw new AmenityRuleError(404, 'not_found', 'Property not found');
  }

  const catalog = await findCatalogItem(db, amenityId);

  if (!catalog || Number(catalog.property_id) !== propertyId) {
    throw new AmenityRuleError(404, 'not_found', 'Amenity not found');
  }

  if (catalog.billing_model !== 'per_use') {
    throw new AmenityRuleError(400, 'invalid_model', 'Usage logging only applies to per-use items');
  }

  const hasReadings =
    input.previous_reading !== undefined &&
    input.previous_reading !== null &&
    input.current_reading !== undefined &&
    input.current_reading !== null;

  let quantity = Number(input.quantity ?? 0);

  if (hasReadings) {
    if (Number(input.previous_reading) < 0 || Number(input.current_reading) <= Number(input.previous_reading)) {
      throw new AmenityRuleError(
        400,
        'invalid_readings',
        'Current meter reading must be greater than previous reading'
      );
    }

    quantity = roundMoney(Number(input.current_reading) - Number(input.previous_reading));
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new AmenityRuleError(400, 'invalid_quantity', 'Quantity must be greater than zero');
  }

  const today = manilaToday();
  const usageDate = input.usage_date ?? today;
  const dueDate = input.due_date ?? addDays(today, 3);
  const unitPrice = roundMoney(Number(catalog.price ?? 0));
  const totalAmount = roundMoney(quantity * unitPrice);
  const readingNote = hasReadings
    ? ` (${input.previous_reading}→${input.current_reading} ${catalog.unit_label})`
    : '';
  const description = `${catalog.name} · ${quantity} ${catalog.unit_label}${readingNote}`;
  const createdIds: number[] = [];

  for (const applicationId of [...new Set(input.application_ids)]) {
    const tenancy = await findConfirmedTenancyByApplication(db, applicationId, propertyId);

    if (!tenancy) {
      throw new AmenityRuleError(404, 'tenancy_not_found', 'Active confirmed tenancy not found');
    }

    const logInsert = await db
      .prepare(
        `
          INSERT INTO amenity_usage_logs (
            paid_amenity_id, application_id, property_id, boarder_id,
            status, quantity, unit_price_snapshot, previous_reading, current_reading,
            total_amount, usage_date, notes, logged_by, reviewed_by, reviewed_at,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, 'posted', ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `
      )
      .bind(
        amenityId,
        applicationId,
        propertyId,
        tenancy.boarder_id,
        quantity,
        unitPrice,
        hasReadings ? roundMoney(Number(input.previous_reading)) : null,
        hasReadings ? roundMoney(Number(input.current_reading)) : null,
        totalAmount,
        usageDate,
        input.notes ?? null,
        landlordId,
        landlordId
      )
      .run();

    const logId = Number(logInsert.meta.last_row_id);

    if (totalAmount > 0) {
      const paymentId = await insertAmenityCharge(db, {
        boarderId: Number(tenancy.boarder_id),
        landlordId: Number(tenancy.landlord_id),
        roomId: Number(tenancy.room_id),
        propertyId,
        applicationId,
        amount: totalAmount,
        dueDate,
        description,
        createdBy: landlordId,
        paidAmenityId: amenityId,
        amenityUsageLogId: logId,
      });

      await db
        .prepare('UPDATE amenity_usage_logs SET payment_id = ? WHERE id = ?')
        .bind(paymentId, logId)
        .run();

      await insertNotification(db, {
        userId: Number(tenancy.boarder_id),
        type: 'bill_added',
        title: `Amenity charge: ${catalog.name}`,
        message: `${description} — ₱${totalAmount.toLocaleString()} due ${dueDate}.`,
        metadata: { payment_id: paymentId, amenity_usage_log_id: logId, amount: totalAmount },
      });
    }

    createdIds.push(logId);
  }

  return await listUsageLogs(
    db,
    `ul.id IN (${createdIds.map(() => '?').join(', ')})`,
    createdIds,
    today
  );
}

export async function reviewAmenityUsage(
  db: D1Database,
  logId: number,
  landlordId: number,
  decision: 'approve' | 'reject',
  opts: { due_date?: string | null; reason?: string | null }
): Promise<AmenityUsageLogDto> {
  const row = await db
    .prepare(
      `
        SELECT ul.*, pa.name AS amenity_name, pa.unit_label AS unit_label
        FROM amenity_usage_logs ul
        JOIN paid_amenities pa ON ul.paid_amenity_id = pa.id
        WHERE ul.id = ?
      `
    )
    .bind(logId)
    .first<UsageLogRow & { application_id: number; boarder_id: number; property_id: number }>();

  if (!row || !(await findLandlordOwnedProperty(db, Number(row.property_id), landlordId))) {
    throw new AmenityRuleError(404, 'not_found', 'Usage request not found');
  }

  if (row.status !== 'pending_approval') {
    throw new AmenityRuleError(409, 'already_reviewed', 'Usage request has already been reviewed');
  }

  const today = manilaToday();

  if (decision === 'reject') {
    await db
      .prepare(
        `
          UPDATE amenity_usage_logs
          SET status = 'rejected',
              rejection_reason = ?,
              reviewed_by = ?,
              reviewed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      )
      .bind(opts.reason || null, landlordId, logId)
      .run();

    await insertNotification(db, {
      userId: Number(row.boarder_id),
      type: 'amenity_rejected',
      title: `Usage request declined: ${row.amenity_name}`,
      message: opts.reason
        ? `Your ${row.amenity_name} request was declined: ${opts.reason}`
        : `Your ${row.amenity_name} request was declined by your landlord.`,
      metadata: { amenity_usage_log_id: logId },
    });
  } else {
    const tenancy = await findConfirmedTenancyByApplication(db, Number(row.application_id));

    if (!tenancy) {
      throw new AmenityRuleError(409, 'tenancy_inactive', 'Tenancy is no longer active');
    }

    const total = roundMoney(Number(row.total_amount));
    const dueDate = opts.due_date ?? addDays(today, 3);
    const description = `${row.amenity_name} · ${Number(row.quantity)} ${row.unit_label}`;
    let paymentId: number | null = null;

    if (total > 0) {
      paymentId = await insertAmenityCharge(db, {
        boarderId: Number(tenancy.boarder_id),
        landlordId: Number(tenancy.landlord_id),
        roomId: Number(tenancy.room_id),
        propertyId: Number(tenancy.property_id),
        applicationId: Number(tenancy.application_id),
        amount: total,
        dueDate,
        description,
        createdBy: landlordId,
        paidAmenityId: Number(row.paid_amenity_id),
        amenityUsageLogId: logId,
      });

      await insertNotification(db, {
        userId: Number(tenancy.boarder_id),
        type: 'bill_added',
        title: `Amenity usage confirmed: ${row.amenity_name}`,
        message: `${description} — ₱${total.toLocaleString()} due ${dueDate}.`,
        metadata: { payment_id: paymentId, amenity_usage_log_id: logId, amount: total },
      });
    }

    await db
      .prepare(
        `
          UPDATE amenity_usage_logs
          SET status = 'posted',
              payment_id = ?,
              reviewed_by = ?,
              reviewed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      )
      .bind(paymentId, landlordId, logId)
      .run();
  }

  const rows = await listUsageLogs(db, 'ul.id = ?', [logId], today);

  return rows[0];
}

export async function listBoarderAmenities(db: D1Database, boarderId: number) {
  const tenancy = await findConfirmedTenancyForBoarder(db, boarderId);

  if (!tenancy) {
    return null;
  }

  const today = manilaToday();
  const [catalog, subscriptions, usageLogs, charges] = await Promise.all([
    listCatalogForProperty(db, Number(tenancy.property_id), true),
    listSubscriptions(db, 'ta.application_id = ?', [tenancy.application_id]),
    listUsageLogs(db, 'ul.application_id = ?', [tenancy.application_id], today),
    db
      .prepare(
        `
          SELECT pay.id, pay.description, pay.amount, pay.due_date, pay.paid_date, pay.status, pr.late_fee_grace_days AS grace_days
          FROM payments pay
          LEFT JOIN properties pr ON pay.property_id = pr.id
          WHERE pay.application_id = ?
            AND pay.charge_type = 'amenity'
          ORDER BY pay.due_date DESC, pay.id DESC
          LIMIT 50
        `
      )
      .bind(tenancy.application_id)
      .all<{
        id: number;
        description: string | null;
        amount: number | string;
        due_date: string;
        paid_date: string | null;
        status: string;
        grace_days: number | null;
      }>(),
  ]);

  const activeMonthlyTotal = roundMoney(
    subscriptions
      .filter(s => s.status === 'active' && s.billing_model_snapshot === 'monthly')
      .reduce((sum, s) => sum + s.unit_price_snapshot * s.quantity, 0)
  );

  return {
    tenancy: {
      application_id: Number(tenancy.application_id),
      property_id: Number(tenancy.property_id),
      property_title: tenancy.property_title,
      room_title: tenancy.room_title,
    },
    active_monthly_total: activeMonthlyTotal,
    catalog,
    subscriptions,
    usage_logs: usageLogs,
    charges: (charges.results ?? []).map(row => ({
      id: Number(row.id),
      description: row.description ?? 'Amenity charge',
      amount: roundMoney(Number(row.amount ?? 0)),
      due_date: toDateOnly(row.due_date),
      paid_date: row.paid_date ? toDateOnly(row.paid_date) : null,
      status: effectiveStatus(
        row.status,
        toDateOnly(row.due_date),
        Number(row.grace_days ?? 3),
        today
      ),
    })),
  };
}

export async function requestBoarderAmenity(
  db: D1Database,
  amenityId: number,
  boarderId: number,
  input: { quantity?: number; notes?: string | null }
): Promise<TenancyAmenityDto> {
  const tenancy = await findConfirmedTenancyForBoarder(db, boarderId);

  if (!tenancy) {
    throw new AmenityRuleError(403, 'no_tenancy', 'Confirmed tenancy required');
  }

  const catalog = await findCatalogItem(db, amenityId);

  if (!catalog || Number(catalog.property_id) !== Number(tenancy.property_id) || Number(catalog.is_active) !== 1) {
    throw new AmenityRuleError(404, 'not_found', 'Amenity not available');
  }

  if (Number(catalog.allow_boarder_request) !== 1) {
    throw new AmenityRuleError(403, 'requests_disabled', 'This amenity is assigned by your landlord');
  }

  if (catalog.billing_model === 'per_use') {
    throw new AmenityRuleError(400, 'invalid_model', 'Use usage-request for per-use amenities');
  }

  const quantity = Math.min(Math.max(Math.round(input.quantity ?? 1), 1), 20);

  await assertSlotCapacity(
    db,
    amenityId,
    catalog.max_slots !== null ? Number(catalog.max_slots) : null,
    quantity
  );

  const unitPrice = roundMoney(Number(catalog.price ?? 0));
  const insert = await db
    .prepare(
      `
        INSERT INTO tenancy_amenities (
          paid_amenity_id, application_id, property_id, boarder_id, room_id,
          status, quantity, unit_price_snapshot, billing_model_snapshot, notes,
          requested_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'pending_approval', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .bind(
      amenityId,
      tenancy.application_id,
      tenancy.property_id,
      boarderId,
      tenancy.room_id,
      quantity,
      unitPrice,
      catalog.billing_model,
      input.notes ?? null,
      boarderId
    )
    .run();

  const subscriptionId = Number(insert.meta.last_row_id);
  const total = roundMoney(unitPrice * quantity);

  await insertNotification(db, {
    userId: Number(tenancy.landlord_id),
    type: 'amenity_request',
    title: `Amenity request: ${catalog.name}`,
    message: `${tenancy.boarder_name} requested ${quantity}× ${catalog.name} (₱${total.toLocaleString()}).`,
    metadata: { tenancy_amenity_id: subscriptionId, property_id: Number(tenancy.property_id) },
  });

  const rows = await listSubscriptions(db, 'ta.id = ?', [subscriptionId]);

  return rows[0];
}

export async function requestBoarderAmenityUsage(
  db: D1Database,
  amenityId: number,
  boarderId: number,
  input: { quantity: number; usage_date?: string | null; notes?: string | null }
): Promise<AmenityUsageLogDto> {
  const tenancy = await findConfirmedTenancyForBoarder(db, boarderId);

  if (!tenancy) {
    throw new AmenityRuleError(403, 'no_tenancy', 'Confirmed tenancy required');
  }

  const catalog = await findCatalogItem(db, amenityId);

  if (!catalog || Number(catalog.property_id) !== Number(tenancy.property_id) || Number(catalog.is_active) !== 1) {
    throw new AmenityRuleError(404, 'not_found', 'Amenity not available');
  }

  if (Number(catalog.allow_boarder_request) !== 1 || catalog.billing_model !== 'per_use') {
    throw new AmenityRuleError(400, 'invalid_request', 'Cannot submit usage request for this amenity');
  }

  const quantity = roundMoney(input.quantity);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new AmenityRuleError(400, 'invalid_quantity', 'Quantity must be greater than zero');
  }

  const today = manilaToday();
  const unitPrice = roundMoney(Number(catalog.price ?? 0));
  const total = roundMoney(quantity * unitPrice);
  const insert = await db
    .prepare(
      `
        INSERT INTO amenity_usage_logs (
          paid_amenity_id, application_id, property_id, boarder_id,
          status, quantity, unit_price_snapshot, total_amount, usage_date,
          notes, logged_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, 'pending_approval', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .bind(
      amenityId,
      tenancy.application_id,
      tenancy.property_id,
      boarderId,
      quantity,
      unitPrice,
      total,
      input.usage_date ?? today,
      input.notes ?? null,
      boarderId
    )
    .run();

  const logId = Number(insert.meta.last_row_id);

  await insertNotification(db, {
    userId: Number(tenancy.landlord_id),
    type: 'amenity_usage_request',
    title: `Usage request: ${catalog.name}`,
    message: `${tenancy.boarder_name} requested ${quantity} ${catalog.unit_label} of ${catalog.name} (₱${total.toLocaleString()}).`,
    metadata: { amenity_usage_log_id: logId, property_id: Number(tenancy.property_id) },
  });

  const rows = await listUsageLogs(db, 'ul.id = ?', [logId], today);

  return rows[0];
}

/** Auto-cancel active/pending amenity subscriptions and pending usage requests when a tenancy ends. */
export async function cancelTenancyAmenitiesForApplications(
  db: D1Database,
  applicationIds: number[]
): Promise<void> {
  if (applicationIds.length === 0) {
    return;
  }

  const placeholders = applicationIds.map(() => '?').join(', ');

  await db
    .prepare(
      `
        UPDATE tenancy_amenities
        SET status = 'cancelled',
            cancelled_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE application_id IN (${placeholders})
          AND status IN ('pending_approval', 'active')
      `
    )
    .bind(...applicationIds)
    .run();

  await db
    .prepare(
      `
        UPDATE amenity_usage_logs
        SET status = 'rejected',
            rejection_reason = 'Tenancy ended',
            updated_at = CURRENT_TIMESTAMP
        WHERE application_id IN (${placeholders})
          AND status = 'pending_approval'
      `
    )
    .bind(...applicationIds)
    .run();
}
