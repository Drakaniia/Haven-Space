# Appwrite Migrations

This directory contains migration files for the Appwrite database schema.

## Migration File Structure

Migration files should follow this naming convention:

```
001_description_of_change.js
002_another_change.js
003_add_new_feature.js
```

Each migration file should export `up` and optionally `down` functions:

```javascript
export async function up(db, dbId) {
  // Migration logic here
  await db.createCollection(dbId, 'new_collection', 'New Collection');
  // Add attributes, etc.
}

export async function down(db, dbId) {
  // Rollback logic (optional)
  // Note: Appwrite doesn't support automatic rollbacks
  await db.deleteCollection(dbId, 'new_collection');
}
```

## Running Migrations

```bash
# Run all pending migrations
bun run appwrite:migrate
# or
node scripts/appwrite-migrate.js

# Check migration status
bun run appwrite:migrate:status
# or
node scripts/appwrite-migrate.js --status
```

## Creating New Migrations

1. Create a new file with the next sequential number
2. Follow the naming convention: `XXX_description.js`
3. Export `up` function with your changes
4. Optionally export `down` function for documentation
5. Test your migration on a development database first

## Important Notes

- Migrations run in alphabetical order
- Once applied, migrations are tracked in the `migrations` collection
- Appwrite doesn't support automatic rollbacks
- Always test migrations on development data first
- Be careful with destructive operations (deleting collections/attributes)

## Common Migration Patterns

### Adding a new collection:

```javascript
export async function up(db, dbId) {
  await db.createCollection(dbId, 'collection_id', 'Collection Name');
  await new Promise(resolve => setTimeout(resolve, 500)); // Wait for collection

  // Add attributes
  await db.createStringAttribute(dbId, 'collection_id', 'name', 255, true);
  await db.createBooleanAttribute(dbId, 'collection_id', 'is_active', false, true);
}
```

### Adding attributes to existing collection:

```javascript
export async function up(db, dbId) {
  await db.createStringAttribute(dbId, 'existing_collection', 'new_field', 100, false);
  await db.createIntegerAttribute(dbId, 'existing_collection', 'count', false, 0, null, 0);
}
```

### Seeding data:

```javascript
export async function up(db, dbId) {
  const data = [
    { name: 'Item 1', value: 'value1' },
    { name: 'Item 2', value: 'value2' },
  ];

  for (const item of data) {
    await db.createDocument(dbId, 'collection_id', ID.unique(), item);
  }
}
```
