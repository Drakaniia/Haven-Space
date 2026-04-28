-- Migration: Add room photos support
-- Date: 2026-04-28

-- Add missing columns to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS size DECIMAL(10,2) NULL COMMENT 'Room size in square meters',
ADD COLUMN IF NOT EXISTS description TEXT NULL COMMENT 'Room description';

-- Create room_photos table (similar to property_photos)
CREATE TABLE IF NOT EXISTS room_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    is_cover TINYINT(1) DEFAULT 0 COMMENT 'Is this the cover/main photo?',
    display_order INT DEFAULT 0 COMMENT 'Order in which photos should be displayed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_room_id (room_id),
    INDEX idx_is_cover (room_id, is_cover),
    INDEX idx_display_order (room_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
