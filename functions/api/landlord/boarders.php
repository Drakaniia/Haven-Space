<?php
/**
 * Landlord Boarders API
 * GET    /api/landlord/boarders.php?propertyId={id} - List boarders for a property
 * POST   /api/landlord/boarders.php                 - Add a boarder (manual entry)
 * DELETE /api/landlord/boarders.php?id={id}         - Remove a boarder (soft-delete application)
 *
 * "Boarders" are users with accepted applications for the landlord's property.
 * Fields like move_in_date, rent, deposit, payment_due_day, payment_status, and
 * last_payment_date are sourced from the applications / rooms tables where available,
 * with sensible defaults otherwise.
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Authenticate and authorise as landlord
$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

$method = $_SERVER['REQUEST_METHOD'];

// ============================================================
// GET - List boarders for a property
// ============================================================
if ($method === 'GET') {
    $propertyId = isset($_GET['propertyId']) ? (int) $_GET['propertyId'] : null;

    if (!$propertyId) {
        json_response(400, ['error' => 'propertyId is required']);
    }

    try {
        $pdo = Connection::getInstance()->getPdo();

        // Verify the property belongs to this landlord
        $checkStmt = $pdo->prepare("
            SELECT id FROM properties
            WHERE id = ? AND landlord_id = ? AND deleted_at IS NULL
        ");
        $checkStmt->execute([$propertyId, $landlordId]);
        if (!$checkStmt->fetch()) {
            json_response(404, ['error' => 'Property not found']);
        }

        // Fetch boarders via accepted applications with extended profile information
        $stmt = $pdo->prepare("
            SELECT
                a.id            AS application_id,
                u.id            AS id,
                u.first_name,
                u.last_name,
                u.email,
                u.phone_number,
                u.current_address,
                u.date_of_birth,
                u.avatar_url,
                a.room_id,
                r.title         AS room_title,
                r.price         AS rent,
                a.created_at    AS move_in_date,
                a.message       AS application_message,
                'active'        AS status,
                'paid'          AS payment_status,
                NULL            AS deposit,
                15              AS payment_due_day,
                NULL            AS last_payment_date
            FROM applications a
            JOIN users u  ON a.boarder_id  = u.id
            LEFT JOIN rooms r ON a.room_id = r.id
            WHERE a.property_id = ?
              AND a.landlord_id = ?
              AND a.status      = 'accepted'
              AND a.deleted_at  IS NULL
              AND u.deleted_at  IS NULL
            ORDER BY a.created_at DESC
        ");
        $stmt->execute([$propertyId, $landlordId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $boarders = array_map(function ($row) {
            return [
                'id'               => (int) $row['id'],
                'application_id'   => (int) $row['application_id'],
                'first_name'       => $row['first_name'],
                'last_name'        => $row['last_name'],
                'email'            => $row['email'],
                'phone'            => $row['phone_number'] ?? null,
                'current_address'  => $row['current_address'] ?? null,
                'date_of_birth'    => $row['date_of_birth'] ?? null,
                'avatar_url'       => $row['avatar_url'] ?? null,
                'room_id'          => $row['room_id'] ? (int) $row['room_id'] : null,
                'room_title'       => $row['room_title'] ?? null,
                'rent'             => $row['rent'] ? (float) $row['rent'] : 0,
                'deposit'          => $row['deposit'] ? (float) $row['deposit'] : 0,
                'move_in_date'     => $row['move_in_date'],
                'application_message' => $row['application_message'] ?? null,
                'status'           => $row['status'],
                'payment_status'   => $row['payment_status'],
                'payment_due_day'  => (int) $row['payment_due_day'],
                'last_payment_date'=> $row['last_payment_date'],
            ];
        }, $rows);

        json_response(200, [
            'success' => true,
            'data'    => [
                'boarders'    => $boarders,
                'total_count' => count($boarders),
            ],
        ]);

    } catch (Exception $e) {
        error_log('Get boarders error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to load boarders']);
    }
}

// ============================================================
// POST - Manually add a boarder (creates an accepted application)
// ============================================================
if ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);

        $required = ['property_id', 'first_name', 'last_name', 'email', 'room_id'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                json_response(400, ['error' => "Missing required field: $field"]);
            }
        }

        $propertyId = (int) $input['property_id'];

        $pdo = Connection::getInstance()->getPdo();

        // Verify property ownership
        $checkStmt = $pdo->prepare("
            SELECT id FROM properties
            WHERE id = ? AND landlord_id = ? AND deleted_at IS NULL
        ");
        $checkStmt->execute([$propertyId, $landlordId]);
        if (!$checkStmt->fetch()) {
            json_response(404, ['error' => 'Property not found']);
        }

        // Find or create the boarder user account
        $userStmt = $pdo->prepare("
            SELECT id FROM users
            WHERE email = ? AND deleted_at IS NULL
        ");
        $userStmt->execute([$input['email']]);
        $existingUser = $userStmt->fetch(PDO::FETCH_ASSOC);

        if ($existingUser) {
            $boarderUserId = (int) $existingUser['id'];
        } else {
            // Create a placeholder boarder account
            $createStmt = $pdo->prepare("
                INSERT INTO users (first_name, last_name, email, role, is_verified, account_status)
                VALUES (?, ?, ?, 'boarder', 0, 'active')
            ");
            $createStmt->execute([
                $input['first_name'],
                $input['last_name'],
                $input['email'],
            ]);
            $boarderUserId = (int) $pdo->lastInsertId();
        }

        // Create an accepted application record
        $appStmt = $pdo->prepare("
            INSERT INTO applications
                (boarder_id, landlord_id, room_id, property_id, status, created_at)
            VALUES (?, ?, ?, ?, 'accepted', ?)
        ");
        $moveInDate = $input['move_in_date'] ?? date('Y-m-d');
        $appStmt->execute([
            $boarderUserId,
            $landlordId,
            (int) $input['room_id'],
            $propertyId,
            $moveInDate,
        ]);

        json_response(201, [
            'success' => true,
            'data'    => [
                'message'    => 'Boarder added successfully',
                'boarder_id' => $boarderUserId,
            ],
        ]);

    } catch (Exception $e) {
        error_log('Add boarder error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to add boarder']);
    }
}

// ============================================================
// DELETE - Remove a boarder (soft-delete their accepted application)
// ============================================================
if ($method === 'DELETE') {
    // ?id= refers to the boarder's user id
    $boarderUserId = isset($_GET['id']) ? (int) $_GET['id'] : null;

    if (!$boarderUserId) {
        json_response(400, ['error' => 'Boarder id is required']);
    }

    try {
        $pdo = Connection::getInstance()->getPdo();

        // Soft-delete the accepted application(s) for this boarder under this landlord
        $stmt = $pdo->prepare("
            UPDATE applications
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE boarder_id  = ?
              AND landlord_id = ?
              AND status      = 'accepted'
              AND deleted_at  IS NULL
        ");
        $stmt->execute([$boarderUserId, $landlordId]);

        if ($stmt->rowCount() === 0) {
            json_response(404, ['error' => 'Boarder not found']);
        }

        json_response(200, [
            'success' => true,
            'data'    => ['message' => 'Boarder removed successfully'],
        ]);

    } catch (Exception $e) {
        error_log('Remove boarder error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to remove boarder']);
    }
}

// Method not allowed
json_response(405, ['error' => 'Method not allowed']);
