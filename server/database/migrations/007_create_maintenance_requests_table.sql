-- Migration: Create Maintenance Requests Table
-- Created at: 2026-04-03

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id INT NOT NULL,
    landlord_id INT NOT NULL,
    property_id INT,
    room_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('Plumbing', 'Electrical', 'Appliances', 'Furniture', 'Structural', 'Cleaning', 'Other') NOT NULL,
    priority ENUM('Low', 'Medium', 'Urgent') DEFAULT 'Medium',
    status ENUM('Pending', 'In Progress', 'Resolved', 'Rejected', 'Closed') DEFAULT 'Pending',
    images JSON,
    assigned_to INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_boarder (boarder_id),
    INDEX idx_landlord (landlord_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS maintenance_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    user_id INT NOT NULL,
    user_type ENUM('boarder', 'landlord', 'contractor') NOT NULL,
    comment TEXT NOT NULL,
    images JSON,
    is_system_note BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_request (request_id),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS maintenance_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_request (request_id)
);
