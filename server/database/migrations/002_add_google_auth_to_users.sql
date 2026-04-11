-- Add Google OAuth columns to users table
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE AFTER email,
    ADD COLUMN IF NOT EXISTS google_picture TEXT AFTER google_id,
    MODIFY COLUMN password_hash VARCHAR(255) NULL;
