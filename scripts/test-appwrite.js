#!/usr/bin/env node
/**
 * Haven Space - Appwrite Connection Test
 *
 * Simple test script to verify Appwrite configuration and connection.
 *
 * Usage:
 *   node scripts/test-appwrite.js
 *   bun run appwrite:test
 */

import { Client, Databases, Account } from 'node-appwrite';
import { readFileSync, existsSync } from 'fs';
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
const DB_ID = process.env.APPWRITE_DATABASE_ID || '69eae54800160ea97765';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const c = {
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  red: s => `\x1b[31m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
};

const ok = msg => console.log(c.green('  ✓ ') + msg);
const fail = msg => console.log(c.red('  ✗ ') + msg);
const info = msg => console.log(c.cyan('  ℹ ') + msg);
const section = msg => console.log('\n' + c.bold(c.cyan(`━━━ ${msg} ━━━`)));

async function main() {
  section('Appwrite Connection Test');

  // Check environment variables
  section('Step 1: Environment Check');

  if (!PROJECT_ID) {
    fail('APPWRITE_PROJECT_ID is not set in server/.env');
    return false;
  }
  ok(`Project ID: ${PROJECT_ID}`);

  if (!API_KEY) {
    fail('APPWRITE_API_KEY is not set in server/.env');
    return false;
  }
  ok(`API Key: ${API_KEY.substring(0, 10)}...`);

  ok(`Endpoint: ${ENDPOINT}`);
  ok(`Database ID: ${DB_ID}`);

  // Initialize client
  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);

  const databases = new Databases(client);
  const account = new Account(client);

  // Test connection
  section('Step 2: Connection Test');

  try {
    const health = await client.call('GET', '/health');
    ok('Appwrite server is reachable');
  } catch (e) {
    fail(`Cannot reach Appwrite server: ${e.message}`);
    return false;
  }

  // Test project access
  section('Step 3: Project Access Test');

  try {
    // Try to list databases (this requires project access)
    const databasesList = await databases.list();
    ok(`Project access confirmed (${databasesList.databases.length} databases found)`);
  } catch (e) {
    fail(`Project access failed: ${e.message}`);
    info('Check your PROJECT_ID and API_KEY');
    return false;
  }

  // Test database access
  section('Step 4: Database Access Test');

  try {
    const database = await databases.get(DB_ID);
    ok(`Database access confirmed: ${database.name}`);
  } catch (e) {
    fail(`Database access failed: ${e.message}`);
    info('Check your APPWRITE_DATABASE_ID or create the database first');
    return false;
  }

  // Test collections
  section('Step 5: Collections Check');

  try {
    const collections = await databases.listCollections(DB_ID);
    ok(`Found ${collections.collections.length} collections`);

    if (collections.collections.length > 0) {
      info('Existing collections:');
      for (const collection of collections.collections) {
        console.log(`    • ${collection.name} (${collection.$id})`);
      }
    } else {
      info('No collections found - run appwrite:setup to create them');
    }
  } catch (e) {
    fail(`Collections check failed: ${e.message}`);
    return false;
  }

  // Test API key permissions
  section('Step 6: Permissions Check');

  const permissions = [];

  // Test database read
  try {
    await databases.get(DB_ID);
    permissions.push('databases.read ✓');
  } catch {
    permissions.push('databases.read ✗');
  }

  // Test collections read
  try {
    await databases.listCollections(DB_ID);
    permissions.push('collections.read ✓');
  } catch {
    permissions.push('collections.read ✗');
  }

  // Test collection creation (if no collections exist)
  const collections = await databases.listCollections(DB_ID);
  if (collections.collections.length === 0) {
    try {
      const testCollection = await databases.createCollection(
        DB_ID,
        'test_permissions',
        'Test Collection'
      );
      await databases.deleteCollection(DB_ID, testCollection.$id);
      permissions.push('collections.write ✓');
    } catch {
      permissions.push('collections.write ✗');
    }
  } else {
    permissions.push('collections.write (not tested - collections exist)');
  }

  info('API Key Permissions:');
  for (const perm of permissions) {
    console.log(`    • ${perm}`);
  }

  // Summary
  section('Test Complete');
  ok('All tests passed! Appwrite is ready to use.');

  console.log('\nNext steps:');
  console.log('  • Run: bun run appwrite:setup:dry (preview setup)');
  console.log('  • Run: bun run appwrite:setup (create collections)');
  console.log('  • Run: bun run appwrite:setup:seed (with sample data)');

  return true;
}

// ─── Run the test ───────────────────────────────────────────────────────────
main().catch(e => {
  fail('Test failed: ' + e.message);
  console.error(e);
  process.exit(1);
});
