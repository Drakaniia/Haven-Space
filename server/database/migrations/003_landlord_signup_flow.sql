-- Migration: Landlord Signup Flow Tables
-- Created: 2026-04-11
-- Description: Database schema for multi-step landlord signup with property location and payment setup

-- ============================================
-- 1. Landlord Profiles Table
-- ============================================
CREATE TABLE IF NOT EXISTS landlord_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    boarding_house_name VARCHAR(255) NOT NULL,
    boarding_house_description TEXT,
    property_type ENUM('Single unit', 'Multi-unit', 'Apartment', 'Dormitory'),
    total_rooms INT DEFAULT 0,
    available_rooms INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_boarding_house_name (boarding_house_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. Property Locations Table
-- ============================================
CREATE TABLE IF NOT EXISTS property_locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    landlord_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'Philippines',
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    INDEX idx_landlord_id (landlord_id),
    INDEX idx_coordinates (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. Payment Methods Table
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    landlord_id INT NOT NULL,
    method_type ENUM('GCash', 'PayMaya', 'Bank Transfer', 'PayPal', 'GrabPay', 'Other') NOT NULL,
    account_number VARCHAR(255), -- Encrypted
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(100), -- For bank transfers only
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    INDEX idx_landlord_id (landlord_id),
    INDEX idx_method_type (method_type),
    INDEX idx_is_primary (is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. Signup Sessions Table (for draft/resume functionality)
-- ============================================
CREATE TABLE IF NOT EXISTS signup_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    role ENUM('landlord', 'boarder'),
    step_data JSON, -- Stores progressive step data
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    INDEX idx_session_token (session_token),
    INDEX idx_email (email),
    INDEX idx_completed (completed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Notes:
-- ============================================
-- 1. All payment account numbers should be encrypted at application level before storage
-- 2. The spatial index on property_locations enables efficient geo-queries for map features
-- 3. Signup sessions can be used to implement "save draft" and "resume later" functionality
-- 4. Consider adding encryption for sensitive payment data using AES-256 or similar
-- 5. Add appropriate indexes based on query patterns as the application grows
