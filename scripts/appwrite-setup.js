#!/usr/bin/env node
/**
 * Haven Space - Automated Appwrite Database Setup Script
 *
 * Smart SQL Parser that automatically converts SQL migrations to Appwrite API calls.
 * Reads schema.sql and all migration files, then translates them to Appwrite operations.
 *
 * Usage:
 *   bun run appwrite:setup
 *   node scripts/appwrite-setup.js
 *
 * Options:
 *   --reset   Drop and recreate all collections (destructive!)
 *   --dry-run Show what would be created without actually doing it
 */

import { Client, Databases } from 'node-appwrite';
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
const DB_ID = process.env.APPWRITE_DATABASE_ID || '69eae54800160ea97765';

if (!PROJECT_ID || !API_KEY) {
  console.error('✗ APPWRITE_PROJECT_ID and APPWRITE_API_KEY must be set in server/.env');
  process.exit(1);
}

const resetMode = process.argv.includes('--reset') || process.argv.includes('-r');
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);

const db = new Databases(client);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const c = {
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  red: s => `\x1b[31m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
  gray: s => `\x1b[90m${s}\x1b[0m`,
};

const ok = msg => console.log(c.green('  ✓ ') + msg);
const skip = msg => console.log(c.yellow('  ~ ') + msg);
const fail = msg => console.log(c.red('  ✗ ') + msg);
const info = msg => console.log(c.cyan('  ℹ ') + msg);
const dry = msg => console.log(c.gray('  ◦ ') + msg);
const section = msg => console.log('\n' + c.bold(c.cyan(`━━━ ${msg} ━━━`)));

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── SQL Parser ─────────────────────────────────────────────────────────────
class SQLParser {
  constructor() {
    this.tables = new Map();
  }

  parseSQL(content, filename = 'unknown') {
    info(`Parsing: ${filename}`);
    const cleanSQL = this.cleanSQL(content);
    const statements = this.splitStatements(cleanSQL);

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;
      try {
        if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
          this.parseCreateTable(trimmed);
        } else if (trimmed.toUpperCase().startsWith('ALTER TABLE')) {
          this.parseAlterTable(trimmed);
        }
        // INSERT statements intentionally ignored — migrations only
      } catch (e) {
        console.warn(c.yellow(`  ⚠ Skipped statement in ${filename}: ${e.message}`));
      }
    }
  }

  cleanSQL(content) {
    return content
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  splitStatements(content) {
    const statements = [];
    let current = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && content[i - 1] !== '\\') {
        inString = false;
        stringChar = '';
      }

      if (!inString && char === ';') {
        statements.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) statements.push(current.trim());
    return statements;
  }

  parseCreateTable(statement) {
    const match = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?\s*\(([\s\S]+)\)/i);
    if (!match) throw new Error('Invalid CREATE TABLE syntax');

    const tableName = match[1];
    const table = {
      name: tableName,
      collectionId: tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      columns: [],
    };

    const items = this.splitTableItems(match[2]);
    for (const item of items) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const upper = trimmed.toUpperCase();
      if (
        upper.startsWith('PRIMARY KEY') ||
        upper.startsWith('FOREIGN KEY') ||
        upper.startsWith('INDEX') ||
        upper.startsWith('KEY') ||
        upper.startsWith('UNIQUE KEY') ||
        upper.startsWith('CONSTRAINT')
      ) {
        continue; // skip constraints — not applicable to Appwrite
      }
      try {
        table.columns.push(this.parseColumnDefinition(trimmed));
      } catch (e) {
        console.warn(c.yellow(`  ⚠ Skipped column in ${tableName}: ${e.message}`));
      }
    }

    this.tables.set(tableName, table);
    ok(`Parsed table: ${tableName} (${table.columns.length} columns)`);
  }

  parseAlterTable(statement) {
    const match = statement.match(/ALTER TABLE\s+`?(\w+)`?\s+(.*)/i);
    if (!match) throw new Error('Invalid ALTER TABLE syntax');

    const tableName = match[1];
    const clause = match[2];

    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, {
        name: tableName,
        collectionId: tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        columns: [],
      });
    }

    if (/ADD COLUMN/i.test(clause)) {
      const colMatch = clause.match(/ADD COLUMN\s+(.+)/i);
      if (colMatch) {
        const column = this.parseColumnDefinition(colMatch[1]);
        this.tables.get(tableName).columns.push(column);
        ok(`  Added column to ${tableName}: ${column.name}`);
      }
    }
    // DROP FOREIGN KEY, ADD CONSTRAINT, etc. are intentionally ignored
  }

  splitTableItems(content) {
    const items = [];
    let current = '';
    let parenLevel = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && content[i - 1] !== '\\') {
        inString = false;
        stringChar = '';
      }

      if (!inString) {
        if (char === '(') parenLevel++;
        else if (char === ')') parenLevel--;
        else if (char === ',' && parenLevel === 0) {
          items.push(current.trim());
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) items.push(current.trim());
    return items;
  }

  parseColumnDefinition(definition) {
    const parts = definition.trim().split(/\s+/);
    const name = parts[0].replace(/`/g, '');
    const rawType = parts[1];

    if (!name || !rawType) throw new Error(`Cannot parse column: ${definition}`);

    const upper = definition.toUpperCase();
    const column = {
      name,
      sqlType: rawType,
      appwriteType: this.mapType(rawType),
      required: upper.includes('NOT NULL'),
      autoIncrement: upper.includes('AUTO_INCREMENT'),
      primaryKey: upper.includes('PRIMARY KEY'),
      defaultValue: null,
      size: null,
      options: [],
    };

    // Size from VARCHAR(n)
    const sizeMatch = rawType.match(/\((\d+)/);
    if (sizeMatch) column.size = parseInt(sizeMatch[1]);

    // ENUM options
    const enumMatch = definition.match(/ENUM\s*\(([^)]+)\)/i);
    if (enumMatch) {
      column.options = enumMatch[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
    }

    // DEFAULT value
    const defaultMatch = definition.match(/DEFAULT\s+([^\s,]+)/i);
    if (defaultMatch) {
      const val = defaultMatch[1];
      if (val === 'CURRENT_TIMESTAMP' || val === 'NULL') {
        column.defaultValue = null;
      } else if (val === 'TRUE') {
        column.defaultValue = true;
      } else if (val === 'FALSE') {
        column.defaultValue = false;
      } else if (!isNaN(val)) {
        column.defaultValue = parseFloat(val);
      } else {
        column.defaultValue = val.replace(/['"]/g, '');
      }
    }

    return column;
  }

  mapType(sqlType) {
    const t = sqlType.toUpperCase();
    if (
      t.startsWith('VARCHAR') ||
      t.startsWith('CHAR') ||
      t === 'TEXT' ||
      t === 'LONGTEXT' ||
      t === 'JSON'
    )
      return 'string';
    if (t === 'INT' || t === 'INTEGER' || t === 'BIGINT' || t === 'SMALLINT' || t === 'TINYINT')
      return 'integer';
    if (t.startsWith('DECIMAL') || t === 'FLOAT' || t === 'DOUBLE') return 'float';
    if (t === 'BOOLEAN' || t === 'BOOL') return 'boolean';
    if (t === 'TIMESTAMP' || t === 'DATETIME' || t === 'DATE') return 'datetime';
    if (t.startsWith('ENUM')) return 'enum';
    return 'string';
  }

  getTables() {
    return Array.from(this.tables.values());
  }
}

// ─── Appwrite Manager ────────────────────────────────────────────────────────
class AppwriteManager {
  constructor(databases, databaseId, dryRun = false) {
    this.db = databases;
    this.dbId = databaseId;
    this.dryRun = dryRun;
  }

  async ensureCollection(table) {
    if (this.dryRun) {
      dry(`Would create collection: ${table.collectionId} (${table.name})`);
      return;
    }
    try {
      await this.db.getCollection(this.dbId, table.collectionId);
      skip(`Collection exists: ${table.collectionId}`);
    } catch {
      await this.db.createCollection(this.dbId, table.collectionId, table.name);
      ok(`Created collection: ${table.collectionId}`);
      await sleep(500);
    }
  }

  async getExistingAttributes(collectionId) {
    if (this.dryRun) return new Set();
    try {
      const res = await this.db.listAttributes(this.dbId, collectionId);
      return new Set(res.attributes.map(a => a.key));
    } catch {
      return new Set();
    }
  }

  async addAttribute(collectionId, column) {
    if (column.autoIncrement && column.primaryKey) return; // Appwrite handles IDs

    const existing = await this.getExistingAttributes(collectionId);

    if (existing.has(column.name)) {
      skip(`  Attribute exists: ${collectionId}.${column.name}`);
      return;
    }

    if (this.dryRun) {
      dry(`  Would add: ${collectionId}.${column.name} (${column.appwriteType})`);
      return;
    }

    try {
      await this.createAttribute(collectionId, column);
      ok(`  Added: ${collectionId}.${column.name}`);
      await sleep(300);
    } catch (e) {
      fail(`  Failed ${collectionId}.${column.name}: ${e.message}`);
    }
  }

  async createAttribute(
    collectionId,
    { name, appwriteType, required, size, options, defaultValue }
  ) {
    switch (appwriteType) {
      case 'string':
        return this.db.createStringAttribute(
          this.dbId,
          collectionId,
          name,
          size || 255,
          required,
          defaultValue
        );
      case 'integer':
        return this.db.createIntegerAttribute(
          this.dbId,
          collectionId,
          name,
          required,
          null,
          null,
          defaultValue
        );
      case 'float':
        return this.db.createFloatAttribute(
          this.dbId,
          collectionId,
          name,
          required,
          null,
          null,
          defaultValue
        );
      case 'boolean':
        return this.db.createBooleanAttribute(
          this.dbId,
          collectionId,
          name,
          required,
          defaultValue
        );
      case 'datetime':
        return this.db.createDatetimeAttribute(this.dbId, collectionId, name, required);
      case 'enum':
        return this.db.createEnumAttribute(
          this.dbId,
          collectionId,
          name,
          options,
          required,
          defaultValue
        );
      default:
        return this.db.createStringAttribute(
          this.dbId,
          collectionId,
          name,
          255,
          required,
          defaultValue
        );
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  section('Haven Space — Appwrite Schema Setup');
  info(`Endpoint:  ${ENDPOINT}`);
  info(`Project:   ${PROJECT_ID}`);
  info(`Database:  ${DB_ID}`);
  info(`Dry Run:   ${dryRun ? 'Yes' : 'No'}`);
  info(`Reset:     ${resetMode ? 'Yes (DESTRUCTIVE)' : 'No'}`);

  if (!dryRun) {
    section('Step 1: Testing Connection');
    try {
      await db.get(DB_ID);
      ok('Connected to Appwrite');
    } catch (e) {
      fail(`Connection failed: ${e.message}`);
      process.exit(1);
    }
  }

  // Parse SQL files
  section('Step 2: Parsing SQL Migrations');
  const parser = new SQLParser();

  const schemaPath = join(__dirname, '../server/database/schema.sql');
  if (existsSync(schemaPath)) {
    parser.parseSQL(readFileSync(schemaPath, 'utf8'), 'schema.sql');
  }

  const migrationsDir = join(__dirname, '../server/database/migrations');
  if (existsSync(migrationsDir)) {
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      parser.parseSQL(readFileSync(join(migrationsDir, file), 'utf8'), file);
    }
  }

  const tables = parser.getTables();
  info(`Found ${tables.length} tables`);

  // Reset if requested
  if (resetMode && !dryRun) {
    section('Step 3: Resetting Collections');
    try {
      const { collections } = await db.listCollections(DB_ID);
      for (const col of collections) {
        try {
          await db.deleteCollection(DB_ID, col.$id);
          ok(`Deleted: ${col.$id}`);
        } catch (e) {
          fail(`Failed to delete ${col.$id}: ${e.message}`);
        }
      }
    } catch (e) {
      fail(`Failed to list collections: ${e.message}`);
    }
  }

  // Create collections and attributes
  section(resetMode ? 'Step 4: Creating Collections' : 'Step 3: Creating Collections');
  const manager = new AppwriteManager(db, DB_ID, dryRun);

  for (const table of tables) {
    await manager.ensureCollection(table);
    for (const column of table.columns) {
      await manager.addAttribute(table.collectionId, column);
    }
  }

  // Done
  section('Done');
  if (dryRun) {
    info('Dry run — no changes made. Remove --dry-run to apply.');
  } else {
    ok(`Schema applied: ${tables.length} collections`);
    info('Run with --dry-run to preview, --reset to recreate all collections');
  }
}

main().catch(e => {
  fail('Setup failed: ' + e.message);
  console.error(e);
  process.exit(1);
});
