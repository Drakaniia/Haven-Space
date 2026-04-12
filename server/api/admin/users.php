<?php
/**
 * Admin — user directory and account status
 *
 * GET  ?q=&role=&limit=&offset=
 * PATCH { userId, account_status }
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

header('Content-Type: application/json');

use App\Api\Middleware;
use App\Core\Database\Connection;

$admin = Middleware::authorize(['admin']);
$adminUserId = (int) ($admin['user_id'] ?? 0);

$pdo = Connection::getInstance()->getPdo();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $q = trim($_GET['q'] ?? '');
    $role = $_GET['role'] ?? '';
    $limit = min(100, max(1, (int) ($_GET['limit'] ?? 50)));
    $offset = max(0, (int) ($_GET['offset'] ?? 0));

    $where = ['1=1'];
    $params = [];

    if ($q !== '') {
        $where[] = '(u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR CONCAT(u.first_name, " ", u.last_name) LIKE ?)';
        $like = '%' . $q . '%';
        array_push($params, $like, $like, $like, $like);
    }

    if (in_array($role, ['boarder', 'landlord', 'admin'], true)) {
        $where[] = 'u.role = ?';
        $params[] = $role;
    }

    $whereSql = implode(' AND ', $where);

    $sql = "SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.is_verified,
                   u.account_status, u.created_at, u.avatar_url
            FROM users u
            WHERE {$whereSql}
            ORDER BY u.created_at DESC
            LIMIT {$limit} OFFSET {$offset}";

    $countSql = "SELECT COUNT(*) FROM users u WHERE {$whereSql}";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        $cstmt = $pdo->prepare($countSql);
        $cstmt->execute($params);
        $total = (int) $cstmt->fetchColumn();

        echo json_encode([
            'success' => true,
            'data' => $rows,
            'meta' => ['total' => $total, 'limit' => $limit, 'offset' => $offset],
        ]);
    } catch (\PDOException $e) {
        error_log('Admin users list error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to list users']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = isset($input['userId']) ? (int) $input['userId'] : 0;
    $accountStatus = $input['account_status'] ?? '';

    if ($userId < 1 || !in_array($accountStatus, ['active', 'suspended', 'banned'], true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid userId or account_status']);
        exit;
    }

    if ($userId === $adminUserId) {
        http_response_code(400);
        echo json_encode(['error' => 'You cannot change your own account status']);
        exit;
    }

    try {
        $stmt = $pdo->prepare('SELECT id, role FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $target = $stmt->fetch();
        if (!$target) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            exit;
        }

        if ($target['role'] === 'admin' && $accountStatus !== 'active') {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot suspend or ban admin accounts']);
            exit;
        }

        $stmt = $pdo->prepare('UPDATE users SET account_status = ? WHERE id = ?');
        $stmt->execute([$accountStatus, $userId]);

        echo json_encode([
            'success' => true,
            'message' => 'User updated',
            'user' => ['id' => $userId, 'account_status' => $accountStatus],
        ]);
    } catch (\PDOException $e) {
        error_log('Admin users patch error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update user']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
