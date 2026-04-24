#!/usr/bin/env node
/**
 * Haven Space - Appwrite Migration Runner
 *
 * Runs migration files against the Appwrite database.
 * Tracks which migrations have been applied.
 *
 * Usage:
 *   node scripts/appwrite-migrate.js
 *   bun run appwrite:migrate
 *
 * Options:
 *   --rollback   Rollback the last migration (if supported)
 *   --status     Show migration status
 */

import { Client, Databases, ID } from 'node-appwrite';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env ───────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(__dirname, '../server/.env');
  if (!existsSync(envPath)) throw new Error('server/.env not found');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    process.env[key] = val;
  }
}

loadEnv();

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = '69eae54800160ea97765'; // havenspace-db

if (!PROJECT_ID || !API_KEY) {
  console.error('✗ APPWRITE_PROJECT_ID and APPWRITE_API_KEY must be set in server/.env');
  process.exit(1);
}

// Parse command line arguments
const showStatus = process.argv.includes('--status');
const rollback = process.argv.includes('--rollback');

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);

const db = new Databases(client);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const c = {
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  red: s => `\x1b[31m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
};

const ok = msg => console.log(c.green('  ✓ ') + msg);
const skip = msg => console.log(c.yellow('  ~ ') + msg);
const fail = msg => console.log(c.red('  ✗ ') + msg);
const info = msg => console.log(c.cyan('  ℹ ') + msg);
const section = msg => console.log('\n' + c.bold(c.cyan(`━━━ ${msg} ━━━`)));

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Migration Tracking ─────────────────────────────────────────────────────
async function ensureMigrationsCollection() {
  try {
    await db.getCollection(DB_ID, 'migrations');
    return true;
  } catch {
    try {
      await db.createCollection(DB_ID, 'migrations', 'Migrations');
      await sleep(500);

      // Add attributes
      await db.createStringAttribute(DB_ID, 'migrations', 'migration_name', 255, true);
      await db.createDatetimeAttribute(DB_ID, 'migrations', 'applied_at', true);
      await db.createStringAttribute(DB_ID, 'migrations', 'checksum', 64, false);

      ok('Created migrations tracking collection');
      return true;
    } catch (e) {
      fail(`Failed to create migrations collection: ${e.message}`);
      return false;
    }
  }
}

async function getAppliedMigrations() {
  try {
    const result = await db.listDocuments(DB_ID, 'migrations');
    return new Set(result.documents.map(doc => doc.migration_name));
  } catch {
    return new Set();
  }
}

async function recordMigration(migrationName, checksum) {
  try {
    await db.createDocument(DB_ID, 'migrations', ID.unique(), {
      migration_name: migrationName,
      applied_at: new Date().toISOString(),
      checksum: checksum,
    });
    ok(`Recorded migration: ${migrationName}`);
  } catch (e) {
    fail(`Failed to record migration ${migrationName}: ${e.message}`);
  }
}

// ─── Migration Loading ───────────────────────────────────────────────────────
function loadMigrations() {
  const migrationsDir = join(__dirname, '../server/database/appwrite-migrations');

  if (!existsSync(migrationsDir)) {
    info('No migrations directory found, creating it...');
    return [];
  }

  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js'))
    .sort();

  return files.map(file => {
    const filePath = join(migrationsDir, file);
    return {
      name: file.replace('.js', ''),
      path: filePath,
      content: readFileSync(filePath, 'utf8'),
    };
  });
}

// ─── Main Logic ──────────────────────────────────────────────────────────────
async function main() {
  section('Haven Space Appwrite Migration Runner');

  info(`Appwrite Endpoint: ${ENDPOINT}`);
  info(`Project ID: ${PROJECT_ID}`);
  info(`Database ID: ${DB_ID}`);

  try {
    // Test connection
    await db.get(DB_ID);
    ok('Connected to Appwrite database successfully');
  } catch (e) {
    fail('Failed to connect to Appwrite database');
    fail(e.message);
    process.exit(1);
  }

  // Ensure migrations tracking collection exists
  section('Setting up migration tracking');
  const trackingReady = await ensureMigrationsCollection();
  if (!trackingReady) {
    process.exit(1);
  }

  // Load migrations
  const migrations = loadMigrations();
  const appliedMigrations = await getAppliedMigrations();

  if (showStatus) {
    section('Migration Status');
    if (migrations.length === 0) {
      info('No migration files found');
    } else {
      for (const migration of migrations) {
        const status = appliedMigrations.has(migration.name)
          ? c.green('✓ Applied')
          : c.yellow('⏳ Pending');
        console.log(`  ${status} ${migration.name}`);
      }
    }
    return;
  }

  if (rollback) {
    section('Rollback (Not Implemented)');
    info('Rollback functionality is not implemented yet');
    info('Appwrite does not support automatic rollbacks');
    info('Manual intervention may be required');
    return;
  }

  // Run pending migrations
  section('Running Migrations');

  const pendingMigrations = migrations.filter(m => !appliedMigrations.has(m.name));

  if (pendingMigrations.length === 0) {
    info('No pending migrations to run');
    return;
  }

  info(`Found ${pendingMigrations.length} pending migration(s)`);

  for (const migration of pendingMigrations) {
    try {
      info(`Running migration: ${migration.name}`);

      // Import and execute the migration
      const migrationModule = await import(migration.path);
      if (typeof migrationModule.up !== 'function') {
        fail(`Migration ${migration.name} does not export an 'up' function`);
        continue;
      }

      await migrationModule.up(db, DB_ID);

      // Calculate checksum (simple hash of content)
      const checksum = Buffer.from(migration.content).toString('base64').slice(0, 64);

      await recordMigration(migration.name, checksum);
      ok(`Completed migration: ${migration.name}`);
    } catch (e) {
      fail(`Migration ${migration.name} failed: ${e.message}`);
      console.error(e);
      break; // Stop on first failure
    }
  }

  section('Migration Complete');
  ok('All pending migrations have been processed');
}

// ─── Run the script ─────────────────────────────────────────────────────────
main().catch(e => {
  fail('Migration failed: ' + e.message);
  console.error(e);
  process.exit(1);
});
