import type { D1Result } from '@cloudflare/workers-types';
export function accessiblePropertyClause(alias?: string): string {
  const ownerColumn = alias ? `${alias}.landlord_id` : 'landlord_id';
  const idColumn = alias ? `${alias}.id` : 'id';

  return `(
    ${ownerColumn} = ?
    OR ${idColumn} IN (
      SELECT pa.property_id
      FROM property_access pa
      WHERE pa.landlord_id = ? AND pa.removed_at IS NULL
    )
  )`;
}

export function insertedId(result: D1Result, label: string): number {
  const id = Number(result.meta.last_row_id);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`${label} insert did not return an ID`);
  }

  return id;
}

export function firstWhere<T>(
  db: D1Database,
  sql: string,
  binds: unknown[],
  label: string
): Promise<T | null> {
  return db
    .prepare(sql)
    .bind(...binds)
    .first<T>();
}
