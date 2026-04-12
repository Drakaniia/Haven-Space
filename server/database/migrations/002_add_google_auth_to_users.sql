-- Add Google OAuth columns to users table
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE AFTER email,
    ADD COLUMN IF NOT EXISTS google_token TEXT AFTER google_id,
    ADD COLUMN IF NOT EXISTS google_refresh_token TEXT AFTER google_token,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT AFTER google_refresh_token,
    MODIFY COLUMN password_hash VARCHAR(255) NULL;
