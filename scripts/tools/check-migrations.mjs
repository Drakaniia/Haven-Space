#!/usr/bin/env bun
/**
 * Guards the D1 migration chain before it reaches a database.
 *
 * D1 tracks applied migrations by *filename*, so the numbering is the ordering:
 * a renamed or renumbered file makes an already-applied migration look pending,
 * and re-applying it fails halfway through the chain (`duplicate column name`),
 * leaving every later migration unapplied — the API then answers 503
 * `database_schema_stale` and pages that load data render an error boundary.
 *
 * Checks, all of which fail the run:
 *   - every file is `NNNN_lower_snake_case.sql`
 *   - numbers are unique and run 0001..N with no gaps
 *   - no file is empty
 *
 * The SQL itself is validated by applying the whole chain to a throwaway local
 * D1 (`bun run cf:api:migrate:check`), which CI runs after this check.
 *
 * Usage:
 *   bun scripts/tools/check-migrations.mjs [dir]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = process.argv[2] ?? join(ROOT, 'workers', 'api', 'migrations');

const NAME_PATTERN = /^(\d{4})_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;

const files = readdirSync(DIR)
  .filter(name => name.toLowerCase().endsWith('.sql'))
  .sort();

const errors = [];
const seen = new Map();

for (const file of files) {
  const match = NAME_PATTERN.exec(file);
  if (!match) {
    errors.push(
      `${file}: name must be NNNN_lower_snake_case.sql (e.g. 0025_messages_threads.sql)`
    );
    continue;
  }
  const number = Number(match[1]);
  if (seen.has(number)) {
    errors.push(`${file}: number ${match[1]} is already used by ${seen.get(number)}`);
    continue;
  }
  seen.set(number, file);

  if (readFileSync(join(DIR, file), 'utf8').trim() === '') {
    errors.push(`${file}: migration is empty`);
  }
}

if (files.length === 0) {
  errors.push(`no .sql migrations found in ${DIR}`);
}

const expected = files.length;
for (let number = 1; number <= expected; number += 1) {
  if (!seen.has(number)) {
    errors.push(`missing migration number ${String(number).padStart(4, '0')} (expected ${expected} migrations, found ${seen.size})`);
  }
}

if (errors.length > 0) {
  console.error('Migration check failed:');
  for (const error of errors) console.error(`  - ${error}`);
  console.error(
    '\nNever rename or renumber a migration that may already be applied — add a new one.'
  );
  process.exit(1);
}

console.log(`Migration check passed: ${expected} migrations, 0001..${String(expected).padStart(4, '0')}.`);
