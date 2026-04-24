/**
 * Migration: Add user preferences collection
 *
 * This is an example migration file showing how to structure
 * Appwrite database migrations.
 */

export async function up(db, dbId) {
  // Create user_preferences collection
  await db.createCollection(dbId, 'user_preferences', 'User Preferences');

  // Wait for collection to be ready
  await new Promise(resolve => setTimeout(resolve, 500));

  // Add attributes
  await db.createStringAttribute(dbId, 'user_preferences', 'user_id', 50, true);
  await db.createStringAttribute(dbId, 'user_preferences', 'preference_key', 100, true);
  await db.createStringAttribute(dbId, 'user_preferences', 'preference_value', 1000, false);
  await db.createBooleanAttribute(dbId, 'user_preferences', 'is_active', false, true);

  console.log('  ✓ Created user_preferences collection with attributes');
}

export async function down(db, dbId) {
  // Rollback logic (optional)
  // Note: Appwrite doesn't support automatic rollbacks
  // This is mainly for documentation purposes

  try {
    await db.deleteCollection(dbId, 'user_preferences');
    console.log('  ✓ Removed user_preferences collection');
  } catch (e) {
    console.log('  ~ Collection may not exist or cannot be deleted');
  }
}
