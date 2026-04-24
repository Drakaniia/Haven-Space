-- Migration: Add welcome message and house rules to landlord_profiles
-- Date: 2026-04-16
-- Description: Adds columns for storing welcome message template and house rules file

ALTER TABLE landlord_profiles
ADD COLUMN IF NOT EXISTS welcome_message TEXT NULL AFTER available_rooms,
ADD COLUMN IF NOT EXISTS house_rules_file_url VARCHAR(255) NULL AFTER welcome_message,
ADD COLUMN IF NOT EXISTS house_rules_file_name VARCHAR(255) NULL AFTER house_rules_file_url,
ADD COLUMN IF NOT EXISTS house_rules_file_size INT NULL AFTER house_rules_file_name;
