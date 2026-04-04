<?php

namespace App\Modules\Maintenance\Repositories;

use App\Core\Database\Connection;
use PDO;

/**
 * Maintenance Repository
 * Handles database operations for maintenance requests
 */
class MaintenanceRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Connection::getInstance()->getPdo();
    }

    /**
     * Get all maintenance requests for a boarder
     */
    public function findByBoarder(int $boarderId, array $filters = []): array
    {
        $sql = 'SELECT * FROM maintenance_requests WHERE boarder_id = ?';
        $params = [$boarderId];

        if (!empty($filters['status'])) {
            $sql .= ' AND status = ?';
            $params[] = $filters['status'];
        }

        $sql .= ' ORDER BY created_at DESC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Get all maintenance requests for a landlord
     */
    public function findByLandlord(int $landlordId, array $filters = []): array
    {
        $sql = 'SELECT mr.*, u.first_name, u.last_name, u.email 
                FROM maintenance_requests mr
                JOIN users u ON mr.boarder_id = u.id
                WHERE mr.landlord_id = ?';
        $params = [$landlordId];

        if (!empty($filters['status'])) {
            $sql .= ' AND mr.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['priority'])) {
            $sql .= ' AND mr.priority = ?';
            $params[] = $filters['priority'];
        }

        $sql .= ' ORDER BY mr.created_at DESC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Get a single maintenance request by ID
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM maintenance_requests WHERE id = ?');
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Create a new maintenance request
     */
    public function create(array $data): int
    {
        $sql = 'INSERT INTO maintenance_requests (boarder_id, landlord_id, property_id, room_id, title, description, category, priority, images) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        
        $this->pdo->prepare($sql)->execute([
            $data['boarder_id'],
            $data['landlord_id'],
            $data['property_id'] ?? null,
            $data['room_id'] ?? null,
            $data['title'],
            $data['description'],
            $data['category'],
            $data['priority'] ?? 'Medium',
            isset($data['images']) ? json_encode($data['images']) : null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Update a maintenance request
     */
    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = [];

        $allowedFields = ['title', 'description', 'category', 'priority', 'status', 'images', 'assigned_to', 'resolved_at'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $params[] = is_array($data[$field]) ? json_encode($data[$field]) : $data[$field];
            }
        }

        if (empty($fields)) {
            return false;
        }

        $params[] = $id;
        $sql = 'UPDATE maintenance_requests SET ' . implode(', ', $fields) . ' WHERE id = ?';
        
        return $this->pdo->prepare($sql)->execute($params);
    }

    /**
     * Delete a maintenance request
     */
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM maintenance_requests WHERE id = ?');
        return $stmt->execute([$id]);
    }

    /**
     * Get comments for a maintenance request
     */
    public function getComments(int $requestId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT mc.*, u.first_name, u.last_name 
             FROM maintenance_comments mc
             JOIN users u ON mc.user_id = u.id
             WHERE mc.request_id = ?
             ORDER BY mc.created_at ASC'
        );
        $stmt->execute([$requestId]);
        return $stmt->fetchAll();
    }

    /**
     * Add a comment to a maintenance request
     */
    public function addComment(int $requestId, int $userId, string $userType, string $comment, ?array $images = null): int
    {
        $sql = 'INSERT INTO maintenance_comments (request_id, user_id, user_type, comment, images) 
                VALUES (?, ?, ?, ?, ?)';
        
        $this->pdo->prepare($sql)->execute([
            $requestId,
            $userId,
            $userType,
            $comment,
            $images ? json_encode($images) : null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Get maintenance statistics
     */
    public function getStats(int $userId, string $role): array
    {
        $field = $role === 'boarder' ? 'boarder_id' : 'landlord_id';

        $sql = "SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
                    SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected
                FROM maintenance_requests
                WHERE $field = ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetch() ?: ['total' => 0, 'pending' => 0, 'in_progress' => 0, 'resolved' => 0, 'rejected' => 0];
    }

    /**
     * Add rating to a maintenance request
     */
    public function addRating(int $requestId, int $boarderId, int $rating, ?string $feedback): int
    {
        $sql = 'INSERT INTO maintenance_ratings (request_id, boarder_id, rating, feedback)
                VALUES (?, ?, ?, ?)';

        $this->pdo->prepare($sql)->execute([
            $requestId,
            $boarderId,
            $rating,
            $feedback,
        ]);

        return (int) $this->pdo->lastInsertId();
    }
}
