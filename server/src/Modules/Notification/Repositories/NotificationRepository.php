<?php

namespace App\Modules\Notification\Repositories;

use App\Core\Database\Connection;
use PDO;

/**
 * Notification Repository
 * Handles database operations for notifications
 */
class NotificationRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Connection::getInstance()->getPdo();
    }

    /**
     * Get all notifications for a user
     */
    public function findByUser(int $userId, int $limit = 50, int $offset = 0): array
    {
        $sql = 'SELECT * FROM notifications
                WHERE user_id = ? AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId, $limit, $offset]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get unread notification count for a user
     */
    public function countUnread(int $userId): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = FALSE AND deleted_at IS NULL'
        );
        $stmt->execute([$userId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * Get a single notification by ID
     */
    public function findById(int $id, int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM notifications WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
        );
        $stmt->execute([$id, $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Create a notification
     */
    public function create(array $data): int
    {
        $sql = 'INSERT INTO notifications (user_id, type, title, message, metadata)
                VALUES (?, ?, ?, ?, ?)';

        $this->pdo->prepare($sql)->execute([
            $data['user_id'],
            $data['type'],
            $data['title'],
            $data['message'] ?? null,
            isset($data['metadata']) ? json_encode($data['metadata']) : null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Mark a notification as read
     */
    public function markAsRead(int $id, int $userId): bool
    {
        $sql = 'UPDATE notifications SET is_read = TRUE, read_at = NOW()
                WHERE id = ? AND user_id = ?';

        return $this->pdo->prepare($sql)->execute([$id, $userId]);
    }

    /**
     * Mark all notifications as read for a user
     */
    public function markAllAsRead(int $userId): bool
    {
        $sql = 'UPDATE notifications SET is_read = TRUE, read_at = NOW()
                WHERE user_id = ? AND is_read = FALSE';

        return $this->pdo->prepare($sql)->execute([$userId]);
    }

    /**
     * Delete a notification (soft delete)
     */
    public function delete(int $id, int $userId): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE notifications SET deleted_at = NOW() WHERE id = ? AND user_id = ?'
        );
        return $stmt->execute([$id, $userId]);
    }

    /**
     * Get accepted applications with property details for a boarder
     */
    public function getAcceptedApplications(int $boarderId): array
    {
        $sql = 'SELECT a.id as application_id, a.status, a.created_at as applied_at,
                       r.title as room_title, r.price as room_price,
                       p.id as property_id, p.title as property_name, p.address,
                       p.latitude, p.longitude,
                       u.first_name as landlord_first_name, u.last_name as landlord_last_name
                FROM applications a
                JOIN rooms r ON a.room_id = r.id
                JOIN properties p ON a.property_id = p.id
                JOIN users u ON a.landlord_id = u.id
                WHERE a.boarder_id = ? AND a.status = ? AND a.deleted_at IS NULL
                ORDER BY a.created_at DESC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$boarderId, 'accepted']);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Check if boarder has any accepted applications
     */
    public function hasAcceptedApplications(int $boarderId): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) FROM applications WHERE boarder_id = ? AND status = ? AND deleted_at IS NULL'
        );
        $stmt->execute([$boarderId, 'accepted']);
        return (int) $stmt->fetchColumn() > 0;
    }
}
