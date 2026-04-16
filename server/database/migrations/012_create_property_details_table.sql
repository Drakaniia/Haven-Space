-- Migration: Create property_details table
-- This table stores additional property information like city, province, amenities, house rules, etc.

CREATE TABLE IF NOT EXISTS property_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    city VARCHAR(100) NULL,
    province VARCHAR(100) NULL,
    property_type VARCHAR(100) NULL,
    deposit VARCHAR(100) NULL COMMENT 'e.g., "2 months", "₱10,000"',
    min_stay VARCHAR(100) NULL COMMENT 'e.g., "6 months", "1 year"',
    house_rules JSON NULL COMMENT 'Array of house rules with icon, title, and description',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_property (property_id),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_property_id ON property_details(property_id);
