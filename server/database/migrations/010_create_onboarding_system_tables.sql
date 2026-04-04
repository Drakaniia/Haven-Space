-- Migration: Create Onboarding System Tables
-- Created at: 2026-04-03

-- Welcome message templates
CREATE TABLE IF NOT EXISTS welcome_message_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    property_id INT,
    message_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    INDEX idx_landlord (landlord_id),
    INDEX idx_property (property_id)
);

-- Landlord documents library
CREATE TABLE IF NOT EXISTS landlord_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    property_id INT,
    document_name VARCHAR(255) NOT NULL,
    document_url VARCHAR(500) NOT NULL,
    document_type VARCHAR(100),
    category ENUM('House Rules', 'Community Guidelines', 'Emergency Contacts', 'Custom') DEFAULT 'Custom',
    file_size INT,
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    auto_send_to_new_boarders BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    INDEX idx_landlord (landlord_id),
    INDEX idx_property (property_id),
    INDEX idx_auto_send (auto_send_to_new_boarders)
);

-- Auto-send configuration (links documents to properties/landlords)
CREATE TABLE IF NOT EXISTS auto_send_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    document_id INT NOT NULL,
    property_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES landlord_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    UNIQUE KEY unique_auto_send (landlord_id, document_id, property_id),
    INDEX idx_landlord (landlord_id)
);

-- Welcome message execution log
CREATE TABLE IF NOT EXISTS welcome_message_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id INT NOT NULL,
    landlord_id INT NOT NULL,
    property_id INT NOT NULL,
    conversation_id INT,
    message_sent BOOLEAN DEFAULT FALSE,
    documents_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    INDEX idx_boarder (boarder_id),
    INDEX idx_landlord (landlord_id),
    INDEX idx_sent (message_sent, documents_sent)
);

-- Boarder document acknowledgments
CREATE TABLE IF NOT EXISTS boarder_document_acknowledgments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id INT NOT NULL,
    document_id INT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES landlord_documents(id) ON DELETE CASCADE,
    UNIQUE KEY unique_acknowledgment (boarder_id, document_id),
    INDEX idx_boarder (boarder_id)
);
