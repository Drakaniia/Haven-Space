export interface AdminSummary {
  counts: {
    users_total: number;
    users_boarder: number;
    users_landlord: number;
    users_admin: number;
    landlords_pending_verification: number;
    properties_total: number;
    properties_pending_moderation: number;
    applications_total: number;
  };
  revenue: {
    platform_fee_percent: number;
    currency: 'PHP';
    note: string;
  };
}

export interface AdminUserRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_verified: number;
  account_status: string;
  created_at: string;
}

export interface AdminPropertyRow {
  id: number;
  title: string;
  price: number;
  listing_moderation_status: string;
  landlord_first: string;
  landlord_last: string;
  landlord_email: string;
}

export interface AdminApplicationRow {
  id: number;
  status: string;
  created_at: string;
  boarder_first: string;
  boarder_last: string;
  boarder_email: string;
  landlord_first: string;
  landlord_last: string;
  room_title: string | null;
}

export interface AdminApplicationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  processed_rate_percent: number;
  by_status: Record<string, number>;
}

export type AdminSettings = Record<string, string>;

const settingDefaults: AdminSettings = {
  maintenance_message: '',
  terms_version: '1.0',
  privacy_version: '1.0',
  platform_fee_percent: '5.00',
  notify_admin_new_landlord: '0',
};

export const allowedAdminSettingKeys = Object.keys(settingDefaults);

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value ?? 0) || 0;
}

function normalizeLimit(value: string | undefined, fallback = 40, max = 100): number {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function normalizeOffset(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function getAdminSummary(db: D1Database): Promise<AdminSummary> {
  const userCounts = await db
    .prepare(
      `
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN role = 'boarder' THEN 1 ELSE 0 END), 0) AS boarder,
          COALESCE(SUM(CASE WHEN role = 'landlord' THEN 1 ELSE 0 END), 0) AS landlord,
          COALESCE(SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END), 0) AS admin
        FROM users
        WHERE deleted_at IS NULL
      `
    )
    .bind()
    .first<{ total: number; boarder: number; landlord: number; admin: number }>();
  const pendingLandlords = await db
    .prepare(
      `
        SELECT COUNT(*) AS pending
        FROM users
        WHERE role = 'landlord'
          AND is_verified = 0
          AND deleted_at IS NULL
      `
    )
    .bind()
    .first<{ pending: number }>();
  const propertyCounts = await db
    .prepare(
      `
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN listing_moderation_status = 'pending_review' THEN 1 ELSE 0 END), 0) AS pending_moderation
        FROM properties
        WHERE deleted_at IS NULL
      `
    )
    .bind()
    .first<{ total: number; pending_moderation: number }>();
  const applicationCounts = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM applications
        WHERE deleted_at IS NULL
      `
    )
    .bind()
    .first<{ total: number }>();
  const platformFee = await db
    .prepare(
      `
        SELECT setting_value
        FROM platform_settings
        WHERE setting_key = 'platform_fee_percent'
        LIMIT 1
      `
    )
    .bind()
    .first<{ setting_value: string }>();

  return {
    counts: {
      users_total: toNumber(userCounts?.total),
      users_boarder: toNumber(userCounts?.boarder),
      users_landlord: toNumber(userCounts?.landlord),
      users_admin: toNumber(userCounts?.admin),
      landlords_pending_verification: toNumber(pendingLandlords?.pending),
      properties_total: toNumber(propertyCounts?.total),
      properties_pending_moderation: toNumber(propertyCounts?.pending_moderation),
      applications_total: toNumber(applicationCounts?.total),
    },
    revenue: {
      platform_fee_percent: toNumber(platformFee?.setting_value ?? '5.00'),
      currency: 'PHP',
      note: 'Platform fee is charged on each successful booking.',
    },
  };
}

export async function listAdminUsers(
  db: D1Database,
  input: { limit?: string; offset?: string; query?: string; role?: string }
): Promise<{ data: AdminUserRow[]; meta: { total: number; limit: number; offset: number } }> {
  const limit = normalizeLimit(input.limit);
  const offset = normalizeOffset(input.offset);
  const conditions = ['deleted_at IS NULL'];
  const binds: unknown[] = [];

  if (input.query?.trim()) {
    conditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
    const term = `%${input.query.trim()}%`;
    binds.push(term, term, term);
  }

  if (input.role?.trim()) {
    conditions.push('role = ?');
    binds.push(input.role.trim());
  }

  const where = conditions.join(' AND ');
  const total = await db
    .prepare(`SELECT COUNT(*) AS total FROM users WHERE ${where}`)
    .bind(...binds)
    .first<{ total: number }>();
  const rows = await db
    .prepare(
      `
        SELECT id, first_name, last_name, email, role, is_verified, account_status, created_at
        FROM users
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
    )
    .bind(...binds, limit, offset)
    .all<AdminUserRow>();

  return {
    data: rows.results,
    meta: {
      total: toNumber(total?.total),
      limit,
      offset,
    },
  };
}

export async function updateAdminUserStatus(
  db: D1Database,
  userId: number,
  accountStatus: string
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE users
        SET account_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
      `
    )
    .bind(accountStatus, userId)
    .run();

  return result.meta.changes ?? 0;
}

export async function listAdminProperties(
  db: D1Database,
  moderationStatus: string | null
): Promise<AdminPropertyRow[]> {
  const rows = moderationStatus
    ? await db
        .prepare(
          `
        SELECT
          p.id,
          p.title,
          p.price,
          p.listing_moderation_status,
          u.first_name AS landlord_first,
          u.last_name AS landlord_last,
          u.email AS landlord_email
        FROM properties p
        JOIN users u ON p.landlord_id = u.id
        WHERE p.listing_moderation_status = ?
          AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC
        LIMIT 100
      `
        )
        .bind(moderationStatus)
        .all<AdminPropertyRow>()
    : await db
        .prepare(
          `
        SELECT
          p.id,
          p.title,
          p.price,
          p.listing_moderation_status,
          u.first_name AS landlord_first,
          u.last_name AS landlord_last,
          u.email AS landlord_email
        FROM properties p
        JOIN users u ON p.landlord_id = u.id
        WHERE p.deleted_at IS NULL
        ORDER BY p.created_at DESC
        LIMIT 100
      `
        )
        .all<AdminPropertyRow>();

  return rows.results;
}

export async function updateAdminPropertyModeration(
  db: D1Database,
  propertyId: number,
  moderationStatus: string
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE properties
        SET listing_moderation_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
      `
    )
    .bind(moderationStatus, propertyId)
    .run();

  return result.meta.changes ?? 0;
}

export async function getAdminApplications(db: D1Database): Promise<{
  stats: AdminApplicationStats;
  applications: AdminApplicationRow[];
}> {
  const statsRow = await db
    .prepare(
      `
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
          COALESCE(SUM(CASE WHEN status IN ('approved', 'accepted', 'confirmed') THEN 1 ELSE 0 END), 0) AS approved,
          COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected
        FROM applications
        WHERE deleted_at IS NULL
      `
    )
    .bind()
    .first<{ total: number; pending: number; approved: number; rejected: number }>();
  const byStatusRows = await db
    .prepare(
      `
        SELECT status, COUNT(*) AS count
        FROM applications
        WHERE deleted_at IS NULL
        GROUP BY status
      `
    )
    .bind()
    .all<{ status: string; count: number }>();
  const applicationRows = await db
    .prepare(
      `
        SELECT
          a.id,
          a.status,
          a.created_at,
          bf.first_name AS boarder_first,
          bf.last_name AS boarder_last,
          bf.email AS boarder_email,
          lf.first_name AS landlord_first,
          lf.last_name AS landlord_last,
          r.title AS room_title
        FROM applications a
        JOIN users bf ON a.boarder_id = bf.id
        JOIN rooms r ON a.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        JOIN users lf ON p.landlord_id = lf.id
        WHERE a.deleted_at IS NULL
        ORDER BY a.created_at DESC
        LIMIT 100
      `
    )
    .bind()
    .all<AdminApplicationRow>();
  const total = toNumber(statsRow?.total);
  const processed = toNumber(statsRow?.approved) + toNumber(statsRow?.rejected);
  const byStatus: Record<string, number> = {};

  for (const row of byStatusRows.results) {
    byStatus[row.status] = toNumber(row.count);
  }

  return {
    stats: {
      total,
      pending: toNumber(statsRow?.pending),
      approved: toNumber(statsRow?.approved),
      rejected: toNumber(statsRow?.rejected),
      processed_rate_percent: total > 0 ? Math.round((processed / total) * 1000) / 10 : 0,
      by_status: byStatus,
    },
    applications: applicationRows.results,
  };
}

export async function getAdminSettings(db: D1Database): Promise<AdminSettings> {
  const rows = await db
    .prepare(
      `
        SELECT setting_key, setting_value
        FROM platform_settings
      `
    )
    .bind()
    .all<{ setting_key: string; setting_value: string }>();
  const settings: AdminSettings = { ...settingDefaults };

  for (const row of rows.results) {
    if (allowedAdminSettingKeys.includes(row.setting_key)) {
      settings[row.setting_key] = row.setting_value;
    }
  }

  return settings;
}

export async function upsertAdminSetting(
  db: D1Database,
  key: string,
  value: string
): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO platform_settings (setting_key, setting_value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_at = CURRENT_TIMESTAMP
      `
    )
    .bind(key, value)
    .run();
}
export async function updateAdminApplicationStatus(
  db: D1Database,
  applicationId: number,
  status: string
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE applications
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
      `
    )
    .bind(status, applicationId)
    .run();

  return result.meta.changes ?? 0;
}

export async function insertAdminAuditLog(
  db: D1Database,
  actorId: number,
  entity: string,
  ids: number[],
  action: string
): Promise<void> {
  try {
    await db
      .prepare(
        `
          INSERT INTO admin_audit_log (actor_id, entity, ids_json, action)
          VALUES (?, ?, ?, ?)
        `
      )
      .bind(actorId, entity, JSON.stringify(ids), action)
      .run();
  } catch {
    // audit table may not exist in older test dbs without migration - best effort
  }
}
