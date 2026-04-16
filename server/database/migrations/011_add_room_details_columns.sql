-- Migration: Add room detail columns to rooms table
-- This adds room_number, room_type, capacity, and deleted_at columns

-- Add room_number column
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS room_number VARCHAR(50) NULL AFTER id;

-- Add room_type column (if title doesn't exist, or rename title to room_type)
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS room_type VARCHAR(100) NULL AFTER room_number;

-- Add capacity column
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 1 AFTER status;

-- Add deleted_at column for soft deletes
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;

-- Update existing rows to have default values
UPDATE rooms SET room_number = CONCAT('Room-', id) WHERE room_number IS NULL;
UPDATE rooms SET room_type = title WHERE room_type IS NULL AND title IS NOT NULL;
UPDATE rooms SET capacity = 1 WHERE capacity IS NULL;
