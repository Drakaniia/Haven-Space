-- Migration: Add Maintenance Request Ratings
-- Created at: 2026-04-03

CREATE TABLE IF NOT EXISTS maintenance_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    boarder_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_request_rating (request_id)
);
