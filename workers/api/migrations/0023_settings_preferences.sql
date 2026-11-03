-- Settings: sign-in method + notification preferences (spec
-- `settings-signin-method` §6).
--
-- Purely additive: one nullable column on `users` and one new per-user table.
-- No row is rewritten, so this is safe on a populated database.

-- 1. Real "last updated" line for the password row in Settings. Written by
--    updatePasswordHash(), which both change-password and reset-password use.
ALTER TABLE users ADD COLUMN password_updated_at TEXT;

-- 2. Per-user notification toggles. A missing row means the defaults
--    (application updates on, messages on, announcements off); defaults live in
--    code as DEFAULT_NOTIFICATION_PREFERENCES and must stay identical here, so a
--    row is only written when the user actually saves a preference.
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER PRIMARY KEY,
  application_updates INTEGER NOT NULL DEFAULT 1,
  messages INTEGER NOT NULL DEFAULT 1,
  announcements INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
