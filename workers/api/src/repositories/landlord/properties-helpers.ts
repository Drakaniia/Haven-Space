import type { D1Database, D1Result } from '@cloudflare/workers-types';
// helpers for landlord properties
export function placeholders(length: number): string {
  return Array.from({ length }, () => '?').join(', ');
}

export function groupRows<Row, Key extends string | number>(
  rows: Row[],
  keyForRow: (row: Row) => Key
): Map<Key, Row[]> {
  const groups = new Map<Key, Row[]>();

  for (const row of rows) {
    const key = keyForRow(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return groups;
}

export function normalizePropertyPhoto(propertyId: number, photoUrl: string): string {
  if (!photoUrl || photoUrl.startsWith('/') || photoUrl.startsWith('http')) {
    return photoUrl;
  }

  return `/storage/properties/${propertyId}/${photoUrl}`;
}

export function insertedId(result: D1Result, label: string): number {
  const id = Number(result.meta.last_row_id);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`${label} insert did not return an ID`);
  }

  return id;
}
