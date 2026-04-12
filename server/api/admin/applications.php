<?php
/**
 * Admin — rental applications oversight
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

header('Content-Type: application/json');

use App\Api\Middleware;
use App\Core\Database\Connection;

Middleware::authorize(['admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$pdo = Connection::getInstance()->getPdo();

try {
    $stmt = $pdo->query(
        "SELECT a.*, r.title AS room_title, r.price AS room_price,
                ub.first_name AS boarder_first, ub.last_name AS boarder_last, ub.email AS boarder_email,
                ul.first_name AS landlord_first, ul.last_name AS landlord_last, ul.email AS landlord_email,
                p.title AS property_title
         FROM applications a
         JOIN rooms r ON a.room_id = r.id
         JOIN users ub ON a.boarder_id = ub.id
         JOIN users ul ON a.landlord_id = ul.id
         LEFT JOIN properties p ON p.id = COALESCE(a.property_id, r.property_id)
         ORDER BY a.created_at DESC
         LIMIT 500"
    );
    $applications = $stmt->fetchAll();

    $statusStmt = $pdo->query(
        'SELECT status, COUNT(*) AS c FROM applications GROUP BY status'
    );
    $byStatus = [];
    while ($row = $statusStmt->fetch()) {
        $byStatus[$row['status']] = (int) $row['c'];
    }

    $total = (int) $pdo->query('SELECT COUNT(*) FROM applications')->fetchColumn();
    $pending = (int) $pdo->query("SELECT COUNT(*) FROM applications WHERE status = 'pending'")->fetchColumn();
    $conversion = $total > 0 ? round((($total - $pending) / $total) * 100, 1) : 0;

    echo json_encode([
        'success' => true,
        'data' => [
            'applications' => $applications,
            'stats' => [
                'total' => $total,
                'pending' => $pending,
                'by_status' => $byStatus,
                'processed_rate_percent' => $conversion,
            ],
        ],
    ]);
} catch (\PDOException $e) {
    error_log('Admin applications error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load applications', 'detail' => $e->getMessage()]);
}
