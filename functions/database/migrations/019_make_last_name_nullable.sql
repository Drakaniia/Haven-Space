-- Migration: Make last_name nullable in users table
-- This allows Google OAuth users who don't have a last name to register successfully

ALTER TABLE users MODIFY COLUMN last_name VARCHAR(100) NULL;