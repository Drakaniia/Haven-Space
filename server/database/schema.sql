-- Haven Space Database Schema - Normalized Version

-- ============================================================================
-- LOOKUP/REFERENCE TABLES (3NF Normalization)
-- ============================================================================

-- User roles lookup table
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO user_roles (role_name, description) VALUES
('boarder', 'Tenant looking for accommodation'),
('landlord', 'Property owner/manager'),
('admin', 'Platform administrator');

-- Account status lookup table
CREATE TABLE IF NOT EXISTS account_statuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO account_statuses (status_name, description, is_active) VALUES
('active', 'Account is active and functional', TRUE),
('suspended', 'Account temporarily suspended', FALSE),
('banned', 'Account permanently banned', FALSE),
('pending_verification', 'Account awaiting verification', FALSE);

-- Verification status lookup table
CREATE TABLE IF NOT EXISTS verification_statuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO verification_statuses (status_name, description) VALUES
('pending', 'Verification pending review'),
('approved', 'Verification approved'),
('rejected', 'Verification rejected');

-- Property types lookup table
CREATE TABLE IF NOT EXISTS property_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO property_types (type_name, description) VALUES
('Single unit', 'Single room or unit'),
('Multi-unit', 'Multiple rooms/units in one property'),
('Apartment', 'Apartment-style accommodation'),
('Dormitory', 'Dormitory-style shared accommodation');

-- Payment method types lookup table
CREATE TABLE IF NOT EXISTS payment_method_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    method_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO payment_method_types (method_name, description) VALUES
('GCash', 'GCash mobile wallet'),
('PayMaya', 'PayMaya digital wallet'),
('Bank Transfer', 'Direct bank transfer'),
('PayPal', 'PayPal online payment'),
('GrabPay', 'GrabPay mobile wallet'),
('Other', 'Other payment methods');

-- Document types lookup table
CREATE TABLE IF NOT EXISTS document_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO document_types (type_name, description, is_required, category) VALUES
('government_id_front', 'Front side of government ID', TRUE, 'identity'),
('government_id_back', 'Back side of government ID', TRUE, 'identity'),
('selfie_with_id', 'Selfie holding government ID', TRUE, 'identity'),
('business_registration', 'Business registration document', FALSE, 'business'),
('tax_id', 'Tax identification document', FALSE, 'business'),
('property_title', 'Property title document', FALSE, 'property'),
('tax_declaration', 'Property tax declaration', FALSE, 'property'),
('business_permit', 'Business permit document', FALSE, 'business'),
('property_photos', 'Property photos', FALSE, 'property');

-- ============================================================================
-- CORE ENTITY TABLES
-- ============================================================================

-- Addresses table (normalized address information)
CREATE TABLE IF NOT EXISTS addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255) NULL,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_location (latitude, longitude),
    INDEX idx_city_province (city, province)
);

-- Files table (normalized file information)
CREATE TABLE IF NOT EXISTS files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NULL COMMENT 'For duplicate detection',
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_hash (file_hash),
    INDEX idx_uploaded_by (uploaded_by)
);

-- Contact information table (normalized contact details)
CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_type ENUM('phone', 'email', 'emergency') NOT NULL,
    contact_value VARCHAR(255) NOT NULL,
    contact_label VARCHAR(100) NULL COMMENT 'e.g., "Primary Phone", "Work Email"',
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type_value (contact_type, contact_value)
);

-- Users Table (normalized)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NULL,
    google_id VARCHAR(255) UNIQUE,
    google_token TEXT,
    google_refresh_token TEXT,
    avatar_file_id INT NULL,
    password_hash VARCHAR(255) NULL,
    role_id INT NOT NULL,
    account_status_id INT NOT NULL DEFAULT 1,
    is_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255) NULL,
    email_verification_expires TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (avatar_file_id) REFERENCES files(id) ON DELETE SET NULL,
    FOREIGN KEY (role_id) REFERENCES user_roles(id),
    FOREIGN KEY (account_status_id) REFERENCES account_statuses(id),
    INDEX idx_email (email),
    INDEX idx_role (role_id),
    INDEX idx_status (account_status_id)
);

-- Add FK from files to users (deferred to avoid circular dependency)
ALTER TABLE files DROP FOREIGN KEY IF EXISTS fk_files_uploaded_by;
ALTER TABLE files ADD CONSTRAINT fk_files_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id);

-- User contacts junction table
CREATE TABLE IF NOT EXISTS user_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    contact_id INT NOT NULL,
    relationship VARCHAR(100) NULL COMMENT 'For emergency contacts',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_contact (user_id, contact_id)
);

-- User addresses junction table
CREATE TABLE IF NOT EXISTS user_addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    address_id INT NOT NULL,
    address_type ENUM('home', 'work', 'property', 'billing') NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_address_type (user_id, address_id, address_type)
);

-- Verification records table (normalized verification tracking)
CREATE TABLE IF NOT EXISTS verification_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('user', 'landlord_profile', 'property', 'document') NOT NULL,
    entity_id INT NOT NULL,
    verification_status_id INT NOT NULL,
    submitted_at TIMESTAMP NULL,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (verification_status_id) REFERENCES verification_statuses(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_status (verification_status_id)
);

-- Properties Table (normalized)
CREATE TABLE IF NOT EXISTS properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    address_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status ENUM('available', 'occupied', 'hidden') DEFAULT 'available',
    listing_moderation_status ENUM('pending_review', 'published', 'rejected') NOT NULL DEFAULT 'published',
    moderation_status ENUM('pending_review', 'published', 'rejected', 'flagged') NOT NULL DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (address_id) REFERENCES addresses(id),
    INDEX idx_landlord (landlord_id),
    INDEX idx_status (status),
    INDEX idx_price (price)
);

-- Login Attempts Table (unchanged - already normalized)
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    attempts INT DEFAULT 1,
    last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (ip_address)
);

-- Landlord Profiles Table (normalized)
CREATE TABLE IF NOT EXISTS landlord_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    boarding_house_name VARCHAR(255) NOT NULL,
    boarding_house_description TEXT,
    property_type_id INT NOT NULL,
    total_rooms INT NOT NULL DEFAULT 1,
    available_rooms INT NOT NULL DEFAULT 1,
    welcome_message TEXT NULL,
    house_rules_file_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_type_id) REFERENCES property_types(id),
    FOREIGN KEY (house_rules_file_id) REFERENCES files(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_landlord (user_id)
);

-- Landlord Verification Data Table
CREATE TABLE IF NOT EXISTS landlord_verification_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    phone_number VARCHAR(20),
    experience_level VARCHAR(50),
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Payment Methods Table (normalized)
CREATE TABLE IF NOT EXISTS payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    payment_method_type_id INT NOT NULL,
    account_number VARCHAR(255) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(100) NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_type_id) REFERENCES payment_method_types(id)
);

-- Amenities lookup table
CREATE TABLE IF NOT EXISTS amenities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amenity_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NULL COMMENT 'e.g., "utilities", "facilities", "services"',
    icon VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Common amenities
INSERT IGNORE INTO amenities (amenity_name, category) VALUES
('WiFi', 'utilities'),
('Air Conditioning', 'utilities'),
('Parking', 'facilities'),
('Laundry', 'facilities'),
('Kitchen Access', 'facilities'),
('Security', 'services'),
('Cleaning Service', 'services');

-- Property Amenities Table (normalized junction table)
CREATE TABLE IF NOT EXISTS property_amenities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    amenity_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_property_amenity (property_id, amenity_id),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
);

-- Rooms Table (normalized)
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    landlord_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(32) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_property (property_id),
    INDEX idx_status (status),
    INDEX idx_price (price)
);

-- Applications Table (normalized)
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id INT NOT NULL,
    landlord_id INT NOT NULL,
    room_id INT NOT NULL,
    property_id INT NULL,
    message TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    INDEX idx_boarder (boarder_id),
    INDEX idx_landlord (landlord_id),
    INDEX idx_status (status)
);

-- Verification log table (normalized)
CREATE TABLE IF NOT EXISTS verification_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    verification_record_id INT NOT NULL,
    admin_user_id INT NOT NULL,
    action ENUM('approve', 'reject', 'note', 'request_changes') NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (verification_record_id) REFERENCES verification_records(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_verification_record (verification_record_id),
    INDEX idx_admin (admin_user_id)
);

-- Documents table (normalized - replaces landlord_verification_documents)
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('user', 'landlord_profile', 'property', 'application') NOT NULL,
    entity_id INT NOT NULL,
    document_type_id INT NOT NULL,
    file_id INT NOT NULL,
    upload_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL,
    verified_by INT NULL,
    FOREIGN KEY (document_type_id) REFERENCES document_types(id),
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_document_type (document_type_id),
    INDEX idx_status (upload_status)
);

-- Boarder Profiles Table (normalized)
CREATE TABLE IF NOT EXISTS boarder_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    budget_min DECIMAL(10, 2) NULL,
    budget_max DECIMAL(10, 2) NULL,
    preferred_location VARCHAR(255) NULL,
    move_in_date DATE NULL,
    occupation VARCHAR(255) NULL,
    bio TEXT NULL,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_boarder (user_id)
);

-- Reports table (normalized)
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('property', 'user', 'room', 'message') NOT NULL,
    entity_id INT NOT NULL,
    reporter_id INT NOT NULL,
    reason VARCHAR(64) NOT NULL,
    details TEXT,
    status ENUM('open', 'reviewing', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_reporter (reporter_id),
    INDEX idx_status (status)
);

-- Disputes table (normalized)
CREATE TABLE IF NOT EXISTS disputes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('payment', 'tenancy', 'property', 'other') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    opened_by INT NOT NULL,
    related_user_id INT NULL,
    related_property_id INT NULL,
    status ENUM('open', 'in_review', 'resolved', 'escalated') NOT NULL DEFAULT 'open',
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (related_property_id) REFERENCES properties(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_opened_by (opened_by),
    INDEX idx_status (status)
);

-- Platform settings (unchanged - already normalized)
CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO platform_settings (setting_key, setting_value) VALUES
    ('maintenance_message', ''),
    ('terms_version', '1.0'),
    ('privacy_version', '1.0'),
    ('notify_admin_new_landlord', '1'),
    ('platform_fee_percent', '0');

-- Conversations table (normalized)
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type ENUM('direct', 'group', 'welcome') DEFAULT 'direct',
    property_id INT NULL,
    created_by INT NOT NULL,
    is_system_thread BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_property (property_id),
    INDEX idx_created_by (created_by),
    INDEX idx_type (type)
);

-- Conversation participants table (normalized)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(50) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_read_at TIMESTAMP NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_conv_user (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id),
    INDEX idx_user (user_id),
    INDEX idx_active (is_active)
);

-- Messages table (normalized)
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_text TEXT NULL,
    has_attachment BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id),
    INDEX idx_sender (sender_id),
    INDEX idx_created_at (created_at)
);

-- Message attachments table (normalized using files table)
CREATE TABLE IF NOT EXISTS message_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    conversation_id INT NOT NULL,
    file_id INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    INDEX idx_message (message_id),
    INDEX idx_conversation (conversation_id)
);

-- Notifications Table (normalized)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(64) NOT NULL COMMENT 'application_accepted, application_rejected, maintenance_update, message, system, etc.',
    title VARCHAR(255) NOT NULL,
    message TEXT,
    metadata JSON NULL COMMENT 'Additional context like application_id, property_id, room_id, etc.',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_type (type)
);

-- Saved Listings Table (normalized)
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

-- Default Super Admin User
-- Email: admin@mail.com
-- Password: Superadmin123
INSERT IGNORE INTO users (first_name, last_name, email, password_hash, role_id, is_verified, account_status_id) VALUES
    ('Super', 'Admin', 'admin@mail.com', '$2y$12$T7quqln.QaMfVHroclj7B.QBk.lNVWIuY65qB5KerTPJG65piAGFy', 3, TRUE, 1);

-- ============================================================================
-- VIEWS FOR BACKWARD COMPATIBILITY (Optional)
-- ============================================================================

-- View to maintain compatibility with existing queries
CREATE OR REPLACE VIEW v_users_legacy AS
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone_number,
    u.google_id,
    u.google_token,
    u.google_refresh_token,
    f.file_url as avatar_url,
    u.password_hash,
    ur.role_name as role,
    u.is_verified,
    u.email_verified,
    u.email_verification_token,
    u.email_verification_expires,
    acs.status_name as account_status,
    vr.verification_status_id,
    vs.status_name as verification_status,
    vr.notes as verification_notes,
    u.created_at,
    u.updated_at,
    u.deleted_at
FROM users u
LEFT JOIN user_roles ur ON u.role_id = ur.id
LEFT JOIN account_statuses acs ON u.account_status_id = acs.id
LEFT JOIN files f ON u.avatar_file_id = f.id
LEFT JOIN verification_records vr ON vr.entity_type = 'user' AND vr.entity_id = u.id
LEFT JOIN verification_statuses vs ON vr.verification_status_id = vs.id;

-- View for properties with address information
CREATE OR REPLACE VIEW v_properties_with_address AS
SELECT 
    p.id,
    p.landlord_id,
    p.title,
    p.description,
    CONCAT(a.address_line_1, 
           CASE WHEN a.address_line_2 IS NOT NULL THEN CONCAT(', ', a.address_line_2) ELSE '' END,
           ', ', a.city, ', ', a.province) as address,
    a.latitude,
    a.longitude,
    p.price,
    p.status,
    p.listing_moderation_status,
    p.moderation_status,
    p.created_at,
    p.updated_at,
    p.deleted_at
FROM properties p
JOIN addresses a ON p.address_id = a.id;

-- Landlord Documents Table
CREATE TABLE IF NOT EXISTS landlord_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    property_id INT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_url VARCHAR(512) NOT NULL,
    document_type VARCHAR(100) NULL,
    category VARCHAR(100) NOT NULL,
    file_size INT NULL,
    auto_send_to_new_boarders BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    INDEX idx_landlord (landlord_id),
    INDEX idx_property (property_id),
    INDEX idx_category (category),
    INDEX idx_active (is_active)
);

-- Welcome Message Logs Table
CREATE TABLE IF NOT EXISTS welcome_message_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id INT NOT NULL,
    landlord_id INT NOT NULL,
    property_id INT NULL,
    conversation_id INT NULL,
    message_sent TEXT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    INDEX idx_boarder (boarder_id),
    INDEX idx_landlord (landlord_id),
    INDEX idx_property (property_id),
    INDEX idx_sent_at (sent_at)
);

-- Boarder Document Acknowledgments Table
CREATE TABLE IF NOT EXISTS boarder_document_acknowledgments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id INT NOT NULL,
    document_id INT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES landlord_documents(id) ON DELETE CASCADE,
    UNIQUE KEY uk_boarder_document (boarder_id, document_id),
    INDEX idx_boarder (boarder_id),
    INDEX idx_document (document_id),
    INDEX idx_acknowledged (acknowledged)
);
JOIN addresses a ON p.address_id = a.id;