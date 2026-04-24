<?php

/**
 * Admin Users API
 * GET /api/admin/users.php?limit=40&offset=0&q=&role=
 * PATCH /api/admin/users.php {userId, account_status}
 *
 * Manages user accounts (search, list, update status)
 */

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
    require_once __DIR__ . '/../cors.php';
}

use App\Core\Database\Connection;

$method = $_SERVER['REQUEST_METHOD'];
$pdo = Connection::getInstance()->getPdo();

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'PATCH':
            handlePatch($pdo);
            break;
        default:
            json_response(405, ['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    error_log('Admin users error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to process request']);
}

function handleGet($pdo) {
    $params = $_GET;
    $limit = intval($params['limit'] ?? 40);
    $offset = intval($params['offset'] ?? 0);
    $q = $params['q'] ?? '';
    $role = $params['role'] ?? '';

    $where = "u.deleted_at IS NULL";
    $params_arr = [];

    if ($q) {
        $where .= " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)";
        $searchTerm = "%$q%";
        $params_arr = array_merge($params_arr, [$searchTerm, $searchTerm, $searchTerm]);
    }

    if ($role) {
        $where .= " AND ur.role_name = ?";
        $params_arr[] = $role;
    }

    // Get total count
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM users u LEFT JOIN user_roles ur ON u.role_id = ur.id WHERE $where");
    $stmt->execute($params_arr);
    $total = intval($stmt->fetch(PDO::FETCH_ASSOC)['total']);

    // Get users
    $limit = intval($limit);
    $offset = intval($offset);
    $stmt = $pdo->prepare("
        SELECT
            u.id, u.first_name, u.last_name, u.email, ur.role_name as role,
            u.is_verified, u.account_status, u.created_at
        FROM users u
        LEFT JOIN user_roles ur ON u.role_id = ur.id
        WHERE $where
        ORDER BY u.created_at DESC
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute($params_arr);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_response(200, [
        'data' => $users,
        'meta' => [
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ],
    ]);
}

function handlePatch($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['userId']) || !isset($input['account_status'])) {
        json_response(400, ['error' => 'Missing required fields: userId, account_status']);
    }

    $userId = intval($input['userId']);
    $accountStatus = $input['account_status'];

    // Validate status
    $allowedStatuses = ['active', 'suspended', 'banned'];
    if (!in_array($accountStatus, $allowedStatuses)) {
        json_response(400, ['error' => 'Invalid account status. Allowed: active, suspended, banned']);
    }

    $stmt = $pdo->prepare("UPDATE users SET account_status = ? WHERE id = ? AND deleted_at IS NULL");
    $stmt->execute([$accountStatus, $userId]);

    if ($stmt->rowCount() === 0) {
        json_response(404, ['error' => 'User not found']);
    }

    json_response(200, ['message' => 'User status updated successfully']);
}
