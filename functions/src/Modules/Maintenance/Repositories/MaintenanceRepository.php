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
    public function findByBoarder(int $boarderId): array
    {
        $sql = 'SELECT m.*, r.title as room_name, r.room_number,
                       p.title as property_name,
                       u.first_name as landlord_first_name, u.last_name as landlord_last_name
                FROM maintenance_requests m
                JOIN rooms r ON m.room_id = r.id
                JOIN properties p ON r.property_id = p.id
                JOIN users u ON m.landlord_id = u.id
                WHERE m.boarder_id = ? AND m.deleted_at IS NULL
                ORDER BY m.created_at DESC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$boarderId]);
        return $stmt->fetchAll();
    }

    /**
     * Get all maintenance requests for a landlord
     */
    public function findByLandlord(int $landlordId): array
    {
        $sql = 'SELECT m.*, r.title as room_name, r.room_number,
                       p.title as property_name,
                       u.first_name as boarder_first_name, u.last_name as boarder_last_name
                FROM maintenance_requests m
                JOIN rooms r ON m.room_id = r.id
                JOIN properties p ON r.property_id = p.id
                LEFT JOIN users u ON m.boarder_id = u.id
                WHERE m.landlord_id = ? AND m.deleted_at IS NULL
                ORDER BY m.created_at DESC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$landlordId]);
        return $stmt->fetchAll();
    }

    /**
     * Get a single maintenance request by ID
     */
    public function findById(int $id): ?array
    {
        $sql = 'SELECT m.*, r.title as room_name, r.room_number,
                       p.title as property_name, p.id as property_id,
                       ub.first_name as boarder_first_name, ub.last_name as boarder_last_name,
                       ul.first_name as landlord_first_name, ul.last_name as landlord_last_name
                FROM maintenance_requests m
                JOIN rooms r ON m.room_id = r.id
                JOIN properties p ON r.property_id = p.id
                LEFT JOIN users ub ON m.boarder_id = ub.id
                JOIN users ul ON m.landlord_id = ul.id
                WHERE m.id = ? AND m.deleted_at IS NULL';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Create a new maintenance request
     */
    public function create(array $data): int
    {
        $sql = 'INSERT INTO maintenance_requests (room_id, boarder_id, landlord_id, title, description, priority, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)';

        $this->pdo->prepare($sql)->execute([
            $data['room_id'],
            $data['boarder_id'],
            $data['landlord_id'],
            $data['title'],
            $data['description'],
            $data['priority'] ?? 'medium',
            $data['status'] ?? 'pending',
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

        $allowedFields = ['status', 'priority', 'title', 'description', 'completed_at'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
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
     * Soft delete a maintenance request
     */
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('UPDATE maintenance_requests SET deleted_at = NOW() WHERE id = ?');
        return $stmt->execute([$id]);
    }

    /**
     * Get statistics for a boarder
     */
    public function getBoarderStats(int $boarderId): array
    {
        $sql = 'SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = "in_progress" THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled
                FROM maintenance_requests
                WHERE boarder_id = ? AND deleted_at IS NULL';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$boarderId]);
        return $stmt->fetch() ?: [];
    }

    /**
     * Get statistics for a landlord
     */
    public function getLandlordStats(int $landlordId): array
    {
        $sql = 'SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = "in_progress" THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN priority = "urgent" THEN 1 ELSE 0 END) as urgent,
                    SUM(CASE WHEN priority = "high" THEN 1 ELSE 0 END) as high
                FROM maintenance_requests
                WHERE landlord_id = ? AND deleted_at IS NULL';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$landlordId]);
        return $stmt->fetch() ?: [];
    }
}
