#!/usr/bin/env bun
/**
 * Backfill `applications.next_due_date` (spec `payments-tracker-redesign` §4.2, D20).
 *
 * The monthly tracker reads the tenancy's `next_due_date` as the single source of
 * truth for when the next rent is due, and migration `0022_payments_tracker`
 * leaves it NULL. This script fills it from the tenancy's move-in day plus its
 * due day — deliberately ignoring the rent charges the old fixed schedule
 * happens to have pre-generated, which is what D20 asks for.
 *
 * Idempotent: rows that already carry a next due date are skipped unless
 * `--force` is passed, so it is safe to re-run.
 *
 * Usage (against the local dev database the running Worker uses):
 *
 *   bun scripts/tools/backfill-next-due-date.mjs --dry-run
 *   bun scripts/tools/backfill-next-due-date.mjs
 *   bun scripts/tools/backfill-next-due-date.mjs --db path/to/miniflare.sqlite
 */

import { Database } from 'bun:sqlite';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  addMonthsClamped,
  manilaToday,
  nextDueAfter,
  toDateOnly,
} from '../../workers/api/src/repositories/payments/helpers.ts';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const explicitDb = (() => {
  const index = args.indexOf('--db');

  return index === -1 ? null : args[index + 1];
})();

/** The miniflare D1 file the local dev Worker uses (largest one wins). */
function discoverLocalDatabase() {
  const root = join(
    import.meta.dir,
    '..',
    '..',
    'workers',
    'api',
    '.wrangler',
    'state',
    'v3',
    'd1'
  );
  const candidates = [];

  for (const entry of safeReaddir(root)) {
    const directory = join(root, entry);

    if (!statSync(directory).isDirectory()) {
      continue;
    }

    for (const file of safeReaddir(directory)) {
      if (!file.endsWith('.sqlite')) {
        continue;
      }

      const path = join(directory, file);
      candidates.push({ path, size: statSync(path).size });
    }
  }

  candidates.sort((left, right) => right.size - left.size);

  return candidates[0]?.path ?? null;
}

function safeReaddir(path) {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

function dueDayOf(moveIn) {
  const day = Number(toDateOnly(moveIn).slice(8, 10));

  return Number.isFinite(day) && day >= 1 ? day : 1;
}

/** The first due date on or after today, anchored on the move-in day (D20). */
function nextDueFor(moveIn, today) {
  const dueDay = dueDayOf(moveIn);
  let next = nextDueAfter(moveIn, dueDay);
  let guard = 0;

  while (next < today && guard < 240) {
    next = addMonthsClamped(next, 1, dueDay);
    guard += 1;
  }

  return next;
}

function main() {
  const path = explicitDb ?? discoverLocalDatabase();

  if (!path) {
    console.error('No local D1 database found. Pass one with --db <path>.');
    process.exit(1);
  }

  const db = new Database(path);

  const columns = db.prepare('PRAGMA table_info(applications)').all();
  const hasColumn = columns.some(column => column.name === 'next_due_date');

  if (!hasColumn) {
    console.error(
      'applications.next_due_date is missing — run `bun run --cwd workers/api migrate:local` first.'
    );
    process.exit(1);
  }

  const today = manilaToday();
  const rows = db
    .prepare(
      `
        SELECT id, COALESCE(confirmed_at, created_at) AS move_in_date, next_due_date
        FROM applications
        WHERE status = 'confirmed' AND deleted_at IS NULL
        ORDER BY id
      `
    )
    .all();

  const changes = [];
  const update = db.prepare('UPDATE applications SET next_due_date = ? WHERE id = ?');

  for (const row of rows) {
    if (row.next_due_date && !force) {
      continue;
    }

    const next = nextDueFor(row.move_in_date, today);

    changes.push({ id: Number(row.id), from: row.next_due_date ?? null, to: next });
  }

  console.log(`${dryRun ? 'DRY RUN — ' : ''}${changes.length} of ${rows.length} tenancies`);
  console.log(`database: ${path}`);
  console.log(`today:    ${today}`);

  for (const change of changes) {
    console.log(`  application ${change.id}: ${change.from ?? 'NULL'} -> ${change.to}`);
  }

  if (dryRun) {
    console.log('Nothing written (--dry-run).');
    db.close();
    return;
  }

  for (const change of changes) {
    update.run(change.to, change.id);
  }

  console.log(`Wrote ${changes.length} next due date(s).`);
  db.close();
}

main();
