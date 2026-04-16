-- Migration: Create property_photos table
-- This table stores multiple photos for each property

CREATE TABLE IF NOT EXISTS property_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    is_cover BOOLEAN DEFAULT FALSE COMMENT 'Is this the cover/main photo?',
    display_order INT DEFAULT 0 COMMENT 'Order in which photos should be displayed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX idx_property_id ON property_photos(property_id);
CREATE INDEX idx_is_cover ON property_photos(property_id, is_cover);
CREATE INDEX idx_display_order ON property_photos(property_id, display_order);
