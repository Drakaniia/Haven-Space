-- Migration: Add Google OAuth Fields to Users Table
-- Description: Add columns to support Google OAuth authentication

USE havenspace_db;

-- Add Google OAuth columns
ALTER TABLE users 
    ADD COLUMN google_id VARCHAR(255) UNIQUE NULL AFTER email,
    ADD COLUMN google_token TEXT NULL AFTER google_id,
    ADD COLUMN google_refresh_token TEXT NULL AFTER google_token,
    ADD COLUMN avatar_url VARCHAR(500) NULL AFTER google_refresh_token,
    MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- Add index for faster Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Update timestamp
ALTER TABLE users 
    MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
