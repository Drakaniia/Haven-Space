/**
 * Migration: Add password_reset_requests collection
 *
 * Creates a collection to store password reset requests
 * for users who request password recovery.
 */

export async function up(db, dbId) {
  // Create password_reset_requests collection
  await db.createCollection(dbId, 'password_reset_requests', 'Password Reset Requests');

  // Wait for collection to be ready
  await new Promise(resolve => setTimeout(resolve, 500));

  // Add attributes
  await db.createStringAttribute(dbId, 'password_reset_requests', 'user_id', 36, true);
  await db.createStringAttribute(dbId, 'password_reset_requests', 'email', 255, true);
  await db.createStringAttribute(dbId, 'password_reset_requests', 'reset_code', 6, true);
  await db.createIntegerAttribute(dbId, 'password_reset_requests', 'expires_at', true);
  await db.createIntegerAttribute(dbId, 'password_reset_requests', 'attempts', true);
  await db.createBooleanAttribute(dbId, 'password_reset_requests', 'is_used', false, true);
  await db.createIntegerAttribute(dbId, 'password_reset_requests', 'used_at', false);
  await db.createIntegerAttribute(dbId, 'password_reset_requests', 'created_at', true);

  // Add indexes
  await db.createIndex(dbId, 'password_reset_requests', 'email', 'key');
  await db.createIndex(dbId, 'password_reset_requests', 'user_id', 'key');
  await db.createIndex(dbId, 'password_reset_requests', 'reset_code', 'key');
  await db.createIndex(dbId, 'password_reset_requests', 'is_used', 'key');

  console.log('  ✓ Created password_reset_requests collection with attributes and indexes');
}

export async function down(db, dbId) {
  // Rollback logic (optional)
  // Note: Appwrite doesn't support automatic rollbacks
  // This is mainly for documentation purposes

  try {
    await db.deleteCollection(dbId, 'password_reset_requests');
    console.log('  ✓ Removed password_reset_requests collection');
  } catch (e) {
    console.log('  ~ Collection may not exist or cannot be deleted');
  }
}
