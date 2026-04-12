<?php
/**
 * Admin — landlord verification queue and history
 *
 * GET  ?status=pending|verified|all — list landlords
 * GET  ?id={userId} — detail with profile + property locations
 * GET  ?history={landlordUserId} — verification audit log
 * POST — approve / reject with optional comment
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

header('Content-Type: application/json');

use App\Api\Middleware;
use App\Core\Database\Connection;

$admin = Middleware::authorize(['admin']);
$adminId = (int) ($admin['user_id'] ?? 0);

$pdo = Connection::getInstance()->getPdo();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['history'])) {
        $lid = (int) $_GET['history'];
        if ($lid < 1) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid history id']);
            exit;
        }
        $stmt = $pdo->prepare(
            'SELECT l.*, a.first_name AS admin_first, a.last_name AS admin_last
             FROM landlord_verification_log l
             JOIN users a ON a.id = l.admin_user_id
             WHERE l.landlord_user_id = ?
             ORDER BY l.created_at DESC'
        );
        $stmt->execute([$lid]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    if (isset($_GET['id'])) {
        $id = (int) $_GET['id'];
        if ($id < 1) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid id']);
            exit;
        }
        $stmt = $pdo->prepare(
            "SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url, u.is_verified, u.created_at,
                    u.account_status, lp.id AS profile_id, lp.boarding_house_name, lp.boarding_house_description,
                    lp.property_type, lp.total_rooms, lp.available_rooms
             FROM users u
             LEFT JOIN landlord_profiles lp ON lp.user_id = u.id
             WHERE u.id = ? AND u.role = 'landlord'"
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['error' => 'Landlord not found']);
            exit;
        }
        $locs = [];
        if (!empty($row['profile_id'])) {
            $q = $pdo->prepare(
                'SELECT id, latitude, longitude, address_line_1, address_line_2, city, province, postal_code, country, is_primary
                 FROM property_locations WHERE landlord_id = ? ORDER BY is_primary DESC, id ASC'
            );
            $q->execute([(int) $row['profile_id']]);
            $locs = $q->fetchAll();
        }
        unset($row['profile_id']);
        $row['property_locations'] = $locs;
        echo json_encode(['success' => true, 'data' => $row]);
        exit;
    }

    $status = $_GET['status'] ?? 'pending';

    try {
        if ($status === 'pending') {
            $stmt = $pdo->prepare("
                SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url,
                       u.is_verified, u.created_at, u.account_status,
                       lp.boarding_house_name, lp.property_type, lp.total_rooms
                FROM users u
                LEFT JOIN landlord_profiles lp ON lp.user_id = u.id
                WHERE u.role = 'landlord' AND u.is_verified = 0
                ORDER BY u.created_at DESC
            ");
            $stmt->execute();
        } elseif ($status === 'verified') {
            $stmt = $pdo->prepare("
                SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url,
                       u.is_verified, u.created_at, u.account_status,
                       lp.boarding_house_name, lp.property_type, lp.total_rooms
                FROM users u
                LEFT JOIN landlord_profiles lp ON lp.user_id = u.id
                WHERE u.role = 'landlord' AND u.is_verified = 1
                ORDER BY u.created_at DESC
            ");
            $stmt->execute();
        } else {
            $stmt = $pdo->prepare("
                SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url,
                       u.is_verified, u.created_at, u.account_status,
                       lp.boarding_house_name, lp.property_type, lp.total_rooms
                FROM users u
                LEFT JOIN landlord_profiles lp ON lp.user_id = u.id
                WHERE u.role = 'landlord'
                ORDER BY u.created_at DESC
            ");
            $stmt->execute();
        }

        echo json_encode([
            'success' => true,
            'data' => $stmt->fetchAll(),
        ]);
    } catch (\PDOException $e) {
        error_log('Admin landlords fetch error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch landlords']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $landlordId = isset($input['landlordId']) ? (int) $input['landlordId'] : 0;
    $action = $input['action'] ?? null;
    $comment = trim($input['comment'] ?? '');

    if ($landlordId < 1 || !in_array($action, ['approve', 'reject'], true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing or invalid landlordId / action. Action must be "approve" or "reject".']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT id, first_name, last_name, email, role FROM users WHERE id = ? AND role = 'landlord'");
        $stmt->execute([$landlordId]);
        $landlord = $stmt->fetch();

        if (!$landlord) {
            http_response_code(404);
            echo json_encode(['error' => 'Landlord not found']);
            exit;
        }

        if ($action === 'approve') {
            $stmt = $pdo->prepare('UPDATE users SET is_verified = 1 WHERE id = ?');
            $stmt->execute([$landlordId]);

            $log = $pdo->prepare(
                'INSERT INTO landlord_verification_log (landlord_user_id, admin_user_id, action, comment) VALUES (?, ?, ?, ?)'
            );
            $log->execute([$landlordId, $adminId, 'approve', $comment !== '' ? $comment : null]);

            echo json_encode([
                'success' => true,
                'message' => "Landlord {$landlord['first_name']} {$landlord['last_name']} has been approved.",
                'landlord' => [
                    'id' => $landlord['id'],
                    'name' => $landlord['first_name'] . ' ' . $landlord['last_name'],
                    'email' => $landlord['email'],
                    'is_verified' => true,
                ],
            ]);
        } else {
            $stmt = $pdo->prepare('UPDATE users SET is_verified = 0 WHERE id = ?');
            $stmt->execute([$landlordId]);

            $log = $pdo->prepare(
                'INSERT INTO landlord_verification_log (landlord_user_id, admin_user_id, action, comment) VALUES (?, ?, ?, ?)'
            );
            $log->execute([$landlordId, $adminId, 'reject', $comment !== '' ? $comment : null]);

            echo json_encode([
                'success' => true,
                'message' => "Landlord {$landlord['first_name']} {$landlord['last_name']} has been rejected.",
                'landlord' => [
                    'id' => $landlord['id'],
                    'name' => $landlord['first_name'] . ' ' . $landlord['last_name'],
                    'email' => $landlord['email'],
                    'is_verified' => false,
                ],
            ]);
        }
    } catch (\PDOException $e) {
        error_log('Admin landlord action error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to process landlord verification']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
