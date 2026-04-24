-- Payments Table
-- Tracks recurring monthly payments for boarders in rooms

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id INT NOT NULL,
    landlord_id INT NOT NULL,
    room_id INT NOT NULL,
    property_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    late_fee DECIMAL(10, 2) DEFAULT 0,
    due_date DATE NOT NULL,
    paid_date DATE NULL,
    status ENUM('pending', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    reminder_sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    INDEX idx_landlord_status (landlord_id, status),
    INDEX idx_due_date (due_date),
    INDEX idx_boarder_status (boarder_id, status)
);
