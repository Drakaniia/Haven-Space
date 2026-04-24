-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    property_id INT NULL COMMENT 'NULL means all properties',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('general', 'maintenance', 'urgent', 'reminder', 'event') NOT NULL DEFAULT 'general',
    priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    publish_date DATE NOT NULL,
    view_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    INDEX idx_landlord_id (landlord_id),
    INDEX idx_property_id (property_id),
    INDEX idx_publish_date (publish_date)
);

-- Create announcement_properties junction table for multi-property targeting
CREATE TABLE IF NOT EXISTS announcement_properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    property_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE KEY unique_announcement_property (announcement_id, property_id)
);

-- Create announcement_views table to track which boarders have seen announcements
CREATE TABLE IF NOT EXISTS announcement_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    user_id INT NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_announcement_view (announcement_id, user_id)
);
