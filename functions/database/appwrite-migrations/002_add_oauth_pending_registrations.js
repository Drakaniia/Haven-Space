/**
 * Migration: Add oauth_pending_registrations collection
 *
 * Creates a collection to store pending OAuth registrations
 * for users who authenticate via Google OAuth.
 */

export async function up(db, dbId) {
  // Create oauth_pending_registrations collection
  await db.createCollection(dbId, 'oauth_pending_registrations', 'OAuth Pending Registrations');

  // Wait for collection to be ready
  await new Promise(resolve => setTimeout(resolve, 500));

  // Add attributes
  await db.createStringAttribute(dbId, 'oauth_pending_registrations', 'token', 64, true);
  await db.createStringAttribute(dbId, 'oauth_pending_registrations', 'google_id', 255, true);
  await db.createStringAttribute(dbId, 'oauth_pending_registrations', 'email', 255, true);
  await db.createStringAttribute(dbId, 'oauth_pending_registrations', 'first_name', 100, false);
  await db.createStringAttribute(dbId, 'oauth_pending_registrations', 'last_name', 100, false);
  await db.createStringAttribute(dbId, 'oauth_pending_registrations', 'avatar_url', 500, false);
  await db.createStringAttribute(dbId, 'oauth_pending_registrations', 'access_token', 2000, false);
  await db.createStringAttribute(dbId, 'oauth_pending_registrations', 'refresh_token', 2000, false);
  await db.createBooleanAttribute(
    dbId,
    'oauth_pending_registrations',
    'email_verified',
    false,
    true
  );
  await db.createBooleanAttribute(
    dbId,
    'oauth_pending_registrations',
    'came_from_login',
    false,
    true
  );
  await db.createDatetimeAttribute(dbId, 'oauth_pending_registrations', 'expires_at', true);
  await db.createDatetimeAttribute(dbId, 'oauth_pending_registrations', 'created_at', true);

  console.log('  ✓ Created oauth_pending_registrations collection with attributes');
}

export async function down(db, dbId) {
  // Rollback logic (optional)
  // Note: Appwrite doesn't support automatic rollbacks
  // This is mainly for documentation purposes

  try {
    await db.deleteCollection(dbId, 'oauth_pending_registrations');
    console.log('  ✓ Removed oauth_pending_registrations collection');
  } catch (e) {
    console.log('  ~ Collection may not exist or cannot be deleted');
  }
}
