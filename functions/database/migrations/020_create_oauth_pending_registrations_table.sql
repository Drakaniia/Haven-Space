-- Migration: Create oauth_pending_registrations table
-- Stores temporary Google OAuth data between callback and role selection
-- Needed because callback (port 8000) and complete-registration (port 80) share different sessions

CREATE TABLE IF NOT EXISTS oauth_pending_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    google_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    access_token TEXT,
    refresh_token TEXT,
    email_verified TINYINT(1) DEFAULT 0,
    came_from_login TINYINT(1) DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
