-- Migration: Add capacity and availability columns to property_details table
-- This adds capacity, availability, and total_rooms fields for property listings

-- Add capacity column
ALTER TABLE property_details 
ADD COLUMN IF NOT EXISTS capacity VARCHAR(50) NULL COMMENT 'e.g., "1", "2", "3", "4", "5+"' AFTER deposit;

-- Add availability column
ALTER TABLE property_details 
ADD COLUMN IF NOT EXISTS availability VARCHAR(50) NULL COMMENT 'e.g., "available-now", "available-soon", "by-appointment"' AFTER min_stay;

-- Add total_rooms column
ALTER TABLE property_details 
ADD COLUMN IF NOT EXISTS total_rooms INT NULL COMMENT 'Total number of rooms in the property' AFTER availability;
