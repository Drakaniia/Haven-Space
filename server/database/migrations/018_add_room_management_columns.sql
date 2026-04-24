-- Migration: Add room management columns for enhanced room functionality
-- This adds columns needed for the room management feature

-- Add description column for room details
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS description TEXT NULL;

-- Add size column for room size in square meters
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS size DECIMAL(5,2) NULL;

-- Add tenant information columns
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS tenant_name VARCHAR(255) NULL;

ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS tenant_contact VARCHAR(50) NULL;

ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS lease_start DATE NULL;

ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS lease_end DATE NULL;

-- Update existing rooms to have proper status values
UPDATE rooms 
SET status = 'available' 
WHERE status NOT IN ('available', 'occupied', 'maintenance', 'deleted');

-- Add index for better performance on property_id queries
CREATE INDEX IF NOT EXISTS idx_rooms_property_id ON rooms(property_id);

-- Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- Add index for better performance on deleted_at queries
CREATE INDEX IF NOT EXISTS idx_rooms_deleted_at ON rooms(deleted_at);