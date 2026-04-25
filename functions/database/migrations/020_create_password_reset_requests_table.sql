-- Migration: Create password_reset_requests table
-- This table stores password reset requests for users who request password recovery

CREATE TABLE password_reset_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    reset_code VARCHAR(6) NOT NULL,
    expires_at INT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at INT NULL,
    created_at INT NOT NULL,
    INDEX idx_email (email),
    INDEX idx_user_id (user_id),
    INDEX idx_reset_code (reset_code),
    INDEX idx_is_used (is_used)
);