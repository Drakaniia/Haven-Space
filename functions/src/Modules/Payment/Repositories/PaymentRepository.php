<?php

namespace App\Modules\Payment\Repositories;

use App\Core\Database\Connection;
use PDO;

/**
 * Payment Repository
 * Database operations for payments
 */
class PaymentRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Connection::getInstance()->getPdo();
    }

    /**
     * Create a new payment
     * 
     * @param array $data
     * @return int Payment ID
     */
    public function create(array $data): int
    {
        $sql = 'INSERT INTO payments (
            boarder_id, landlord_id, room_id, property_id, amount, late_fee, due_date, status,
            payment_method, reference_number, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $data['boarder_id'],
            $data['landlord_id'],
            $data['room_id'],
            $data['property_id'],
            $data['amount'],
            $data['late_fee'] ?? 0,
            $data['due_date'],
            $data['status'] ?? 'pending',
            $data['payment_method'] ?? null,
            $data['reference_number'] ?? null,
            $data['notes'] ?? null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Find payment by ID
     * 
     * @param int $id
     * @return array|null
     */
    public function findById(int $id): ?array
    {
        $sql = 'SELECT p.*, 
            u.first_name as boarder_first_name,
            u.last_name as boarder_last_name,
            u.email as boarder_email,
            r.title as room_title,
            pr.title as property_title
        FROM payments p
        INNER JOIN users u ON p.boarder_id = u.id
        INNER JOIN rooms r ON p.room_id = r.id
        INNER JOIN properties pr ON p.property_id = pr.id
        WHERE p.id = ?';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    /**
     * Find all payments for a landlord
     * 
     * @param int $landlordId
     * @param array $filters
     * @return array
     */
    public function findByLandlord(int $landlordId, array $filters = []): array
    {
        $sql = 'SELECT p.*, 
            u.first_name as boarder_first_name,
            u.last_name as boarder_last_name,
            u.email as boarder_email,
            r.title as room_title,
            pr.title as property_title
        FROM payments p
        INNER JOIN users u ON p.boarder_id = u.id
        INNER JOIN rooms r ON p.room_id = r.id
        INNER JOIN properties pr ON p.property_id = pr.id
        WHERE p.landlord_id = ?';

        $params = [$landlordId];

        if (!empty($filters['status'])) {
            $sql .= ' AND p.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['property_id'])) {
            $sql .= ' AND p.property_id = ?';
            $params[] = $filters['property_id'];
        }

        $sql .= ' ORDER BY p.due_date DESC, p.created_at DESC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update payment
     * 
     * @param int $id
     * @param array $data
     * @return bool
     */
    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = [];

        foreach ($data as $key => $value) {
            $fields[] = "$key = ?";
            $params[] = $value;
        }

        $params[] = $id;

        $sql = 'UPDATE payments SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $this->pdo->prepare($sql);

        return $stmt->execute($params);
    }

    /**
     * Count paid on time this month
     * 
     * @param int $landlordId
     * @return int
     */
    public function countPaidOnTime(int $landlordId): int
    {
        $sql = 'SELECT COUNT(*) as count
        FROM payments
        WHERE landlord_id = ?
            AND status = "paid"
            AND MONTH(paid_date) = MONTH(CURRENT_DATE())
            AND YEAR(paid_date) = YEAR(CURRENT_DATE())
            AND paid_date <= due_date';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$landlordId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Count payments due soon
     * 
     * @param int $landlordId
     * @param string $today
     * @param string $sevenDaysFromNow
     * @return int
     */
    public function countDueSoon(int $landlordId, string $today, string $sevenDaysFromNow): int
    {
        $sql = 'SELECT COUNT(*) as count
        FROM payments
        WHERE landlord_id = ?
            AND status = "pending"
            AND due_date BETWEEN ? AND ?';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$landlordId, $today, $sevenDaysFromNow]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Count overdue payments
     * 
     * @param int $landlordId
     * @param string $today
     * @return int
     */
    public function countOverdue(int $landlordId, string $today): int
    {
        $sql = 'SELECT COUNT(*) as count
        FROM payments
        WHERE landlord_id = ?
            AND status = "overdue"';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$landlordId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Get total revenue this month
     * 
     * @param int $landlordId
     * @return float
     */
    public function getTotalRevenueThisMonth(int $landlordId): float
    {
        $sql = 'SELECT COALESCE(SUM(amount + late_fee), 0) as total
        FROM payments
        WHERE landlord_id = ?
            AND status = "paid"
            AND MONTH(paid_date) = MONTH(CURRENT_DATE())
            AND YEAR(paid_date) = YEAR(CURRENT_DATE())';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$landlordId]);

        return (float) $stmt->fetchColumn();
    }

    /**
     * Find payment by boarder and due date
     * 
     * @param int $boarderId
     * @param string $dueDate
     * @return array|null
     */
    public function findByBoarderAndDueDate(int $boarderId, string $dueDate): ?array
    {
        $sql = 'SELECT * FROM payments WHERE boarder_id = ? AND due_date = ?';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$boarderId, $dueDate]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    /**
     * Mark overdue payments
     * 
     * @param string $today
     * @return int Number of payments marked as overdue
     */
    public function markOverdue(string $today): int
    {
        $sql = 'UPDATE payments 
        SET status = "overdue" 
        WHERE status = "pending" 
            AND due_date < ?';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$today]);

        return $stmt->rowCount();
    }
}
