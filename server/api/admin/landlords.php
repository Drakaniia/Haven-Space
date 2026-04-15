<?php

/**
 * Admin Landlords API
 * GET /api/admin/landlords.php?status=pending
 * GET /api/admin/landlords.php?id={id}
 * GET /api/admin/landlords.php?history={id}
 * POST /api/admin/landlords.php {landlordId, action, comment}
 *
 * Manages landlord verification and details
 */

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
    require_once __DIR__ . '/../cors.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Core\Database\Connection;
use App\Api\Middleware;

$method = $_SERVER['REQUEST_METHOD'];
$pdo = Connection::getInstance()->getPdo();

try {
    switch ($method) {
        case 'GET':
            Middleware::authorize(['admin']);
            handleGet($pdo);
            break;
        case 'POST':
            $admin = Middleware::authorize(['admin']);
            handlePost($pdo, $admin['user_id']);
            break;
        default:
            json_response(405, ['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    error_log('Admin landlords error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to process request']);
}

function handleGet($pdo) {
    $params = $_GET;

    // Get landlord detail by ID
    if (isset($params['id'])) {
        $id = intval($params['id']);
        
        // Get landlord info
        $stmt = $pdo->prepare("
            SELECT
                u.id, u.first_name, u.last_name, u.email, u.is_verified, u.created_at,
                lp.boarding_house_name
            FROM users u
            LEFT JOIN landlord_profiles lp ON u.id = lp.user_id
            WHERE u.id = ? AND u.role = 'landlord' AND u.deleted_at IS NULL
            LIMIT 1
        ");
        $stmt->execute([$id]);
        $landlord = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$landlord) {
            json_response(404, ['error' => 'Landlord not found']);
        }

        // Get property locations
        $stmt = $pdo->prepare("
            SELECT
                pl.address_line_1, pl.city, pl.province, pl.latitude, pl.longitude
            FROM property_locations pl
            WHERE pl.landlord_id = (SELECT id FROM landlord_profiles WHERE user_id = ?)
        ");
        $stmt->execute([$id]);
        $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $landlord['property_locations'] = $locations;
        json_response(200, ['data' => $landlord]);
    }

    // Get verification history
    if (isset($params['history'])) {
        $landlordId = intval($params['history']);

        $stmt = $pdo->prepare("
            SELECT
                l.created_at, l.action, l.comment,
                u.first_name as admin_first, u.last_name as admin_last
            FROM landlord_verification_log l
            JOIN users u ON l.admin_user_id = u.id
            WHERE l.landlord_user_id = ?
            ORDER BY l.created_at DESC
            LIMIT 50
        ");
        $stmt->execute([$landlordId]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        json_response(200, ['data' => $history]);
    }

    // Get landlords list with optional status filter
    $status = $params['status'] ?? '';
    $limit = intval($params['limit'] ?? 50);
    $offset = intval($params['offset'] ?? 0);

    $where = "u.role = 'landlord' AND u.deleted_at IS NULL";
    $params_arr = [];

    if ($status === 'pending') {
        $where .= " AND u.is_verified = 0";
    } elseif ($status === 'verified') {
        $where .= " AND u.is_verified = 1";
    }

    $limit = intval($limit);
    $offset = intval($offset);
    $stmt = $pdo->prepare("
        SELECT
            u.id, u.first_name, u.last_name, u.email, u.is_verified, u.created_at,
            lp.boarding_house_name
        FROM users u
        LEFT JOIN landlord_profiles lp ON u.id = lp.user_id
        WHERE $where
        ORDER BY u.created_at DESC
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute($params_arr);
    $landlords = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_response(200, ['data' => $landlords]);
}

function handlePost($pdo, $adminId = null) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['landlordId']) || !isset($input['action'])) {
        json_response(400, ['error' => 'Missing required fields: landlordId, action']);
    }

    $landlordId = intval($input['landlordId']);
    $action = $input['action']; // 'approve' or 'reject'
    $comment = $input['comment'] ?? '';

    if ($action === 'approve') {
        $stmt = $pdo->prepare("UPDATE users SET is_verified = 1 WHERE id = ? AND role = 'landlord'");
        $stmt->execute([$landlordId]);
    } elseif ($action === 'reject') {
        $stmt = $pdo->prepare("UPDATE users SET is_verified = 0 WHERE id = ? AND role = 'landlord'");
        $stmt->execute([$landlordId]);
    } else {
        json_response(400, ['error' => 'Invalid action. Use approve or reject']);
    }

    // Log verification action
    if ($adminId) {
        $stmt = $pdo->prepare("
            INSERT INTO landlord_verification_log (landlord_user_id, admin_user_id, action, comment, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$landlordId, $adminId, $action, $comment]);
    }

    json_response(200, ['message' => 'Landlord verification updated successfully']);
}
