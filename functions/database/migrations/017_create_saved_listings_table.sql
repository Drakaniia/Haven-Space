-- Migration: Create saved_listings table
-- Date: 2026-04-17
-- Description: Add table to store boarder saved property listings

CREATE TABLE IF NOT EXISTS saved_listings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id INT NOT NULL,
    property_id INT NOT NULL,
    room_id INT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY unique_boarder_property (boarder_id, property_id),
    FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    INDEX idx_boarder_saved (boarder_id, saved_at),
    INDEX idx_property_saved (property_id)
);