<?php

namespace App\Modules\Application\Repositories;

use App\Core\Database\Connection;
use PDO;

/**
 * Application Repository
 * Handles database operations for rental applications
 */
class ApplicationRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Connection::getInstance()->getPdo();
    }

    /**
     * Get all applications for a boarder
     */
    public function findByBoarder(int $boarderId): array
    {
        $sql = 'SELECT a.*, r.title as room_title, r.price as room_price,
                       u.first_name, u.last_name, u.email as landlord_email
                FROM applications a
                JOIN rooms r ON a.room_id = r.id
                JOIN users u ON a.landlord_id = u.id
                WHERE a.boarder_id = ?
                ORDER BY a.created_at DESC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$boarderId]);
        return $stmt->fetchAll();
    }

    /**
     * Get all applications for a landlord
     */
    public function findByLandlord(int $landlordId): array
    {
        $sql = 'SELECT a.*, r.title as room_title, r.price as room_price,
                       u.first_name, u.last_name, u.email as boarder_email
                FROM applications a
                JOIN rooms r ON a.room_id = r.id
                JOIN users u ON a.boarder_id = u.id
                WHERE a.landlord_id = ?
                ORDER BY a.created_at DESC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$landlordId]);
        return $stmt->fetchAll();
    }

    /**
     * Get a single application by ID
     */
    public function findById(int $id): ?array
    {
        $sql = 'SELECT a.*, r.title as room_title, r.price as room_price,
                       r.property_id,
                       ub.first_name as boarder_first_name, ub.last_name as boarder_last_name,
                       ul.first_name as landlord_first_name, ul.last_name as landlord_last_name
                FROM applications a
                JOIN rooms r ON a.room_id = r.id
                JOIN users ub ON a.boarder_id = ub.id
                JOIN users ul ON a.landlord_id = ul.id
                WHERE a.id = ?';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Create a new application
     */
    public function create(array $data): int
    {
        $sql = 'INSERT INTO applications (boarder_id, landlord_id, room_id, property_id, message, status)
                VALUES (?, ?, ?, ?, ?, ?)';

        $this->pdo->prepare($sql)->execute([
            $data['boarder_id'],
            $data['landlord_id'],
            $data['room_id'],
            $data['property_id'] ?? null,
            $data['message'],
            $data['status'] ?? 'pending',
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Update an application
     */
    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = [];

        $allowedFields = ['status', 'message'];

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
        $sql = 'UPDATE applications SET ' . implode(', ', $fields) . ' WHERE id = ?';

        return $this->pdo->prepare($sql)->execute($params);
    }

    /**
     * Delete an application
     */
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM applications WHERE id = ?');
        return $stmt->execute([$id]);
    }

    /**
     * Get property details for onboarding
     */
    public function getPropertyDetails(int $roomId): ?array
    {
        $sql = 'SELECT p.name as house_name, p.id as property_id
                FROM rooms r
                JOIN properties p ON r.property_id = p.id
                WHERE r.id = ?';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$roomId]);
        $result = $stmt->fetch();
        return $result ?: null;
    }
}
