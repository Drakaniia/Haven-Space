<?php
/**
 * Admin — property reports & disputes
 *
 * GET  — combined queue
 * PATCH { kind: "report"|"dispute", id, status, admin_notes? }
 * POST (disputes only) { type, title, description, opened_by_user_id, related_user_id?, related_property_id? }
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

header('Content-Type: application/json');

use App\Api\Middleware;
use App\Core\Database\Connection;

Middleware::authorize(['admin']);

$pdo = Connection::getInstance()->getPdo();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $reports = $pdo->query(
            "SELECT pr.*, p.title AS property_title, u.email AS reporter_email,
                    u.first_name AS reporter_first, u.last_name AS reporter_last
             FROM property_reports pr
             JOIN properties p ON p.id = pr.property_id
             JOIN users u ON u.id = pr.reporter_user_id
             ORDER BY pr.created_at DESC"
        )->fetchAll();

        $disputes = $pdo->query(
            "SELECT d.*,
                    o.email AS opened_by_email,
                    ru.email AS related_user_email
             FROM disputes d
             JOIN users o ON o.id = d.opened_by_user_id
             LEFT JOIN users ru ON ru.id = d.related_user_id
             ORDER BY d.created_at DESC"
        )->fetchAll();

        echo json_encode([
            'success' => true,
            'data' => [
                'property_reports' => $reports,
                'disputes' => $disputes,
            ],
        ]);
    } catch (\PDOException $e) {
        error_log('Admin reports get error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to load reports']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $type = $input['type'] ?? '';
    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $openedBy = isset($input['opened_by_user_id']) ? (int) $input['opened_by_user_id'] : 0;
    $relatedUser = isset($input['related_user_id']) ? (int) $input['related_user_id'] : null;
    $relatedProp = isset($input['related_property_id']) ? (int) $input['related_property_id'] : null;

    $types = ['payment', 'tenancy', 'property', 'other'];
    if (!in_array($type, $types, true) || $title === '' || $openedBy < 1) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid dispute payload']);
        exit;
    }

    if ($relatedUser !== null && $relatedUser < 1) {
        $relatedUser = null;
    }
    if ($relatedProp !== null && $relatedProp < 1) {
        $relatedProp = null;
    }

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO disputes (type, title, description, opened_by_user_id, related_user_id, related_property_id)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$type, $title, $description ?: null, $openedBy, $relatedUser, $relatedProp]);
        $id = (int) $pdo->lastInsertId();

        echo json_encode([
            'success' => true,
            'dispute' => ['id' => $id],
        ]);
    } catch (\PDOException $e) {
        error_log('Admin reports post error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create dispute']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $input = json_decode(file_get_contents('php://input'), true);
    $kind = $input['kind'] ?? '';
    $id = isset($input['id']) ? (int) $input['id'] : 0;
    $status = $input['status'] ?? '';
    $notes = $input['admin_notes'] ?? null;

    if ($id < 1 || !in_array($kind, ['report', 'dispute'], true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid kind or id']);
        exit;
    }

    try {
        if ($kind === 'report') {
            $allowed = ['open', 'reviewing', 'resolved', 'dismissed'];
            if (!in_array($status, $allowed, true)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid status for report']);
                exit;
            }
            if (array_key_exists('admin_notes', $input)) {
                $stmt = $pdo->prepare('UPDATE property_reports SET status = ?, admin_notes = ? WHERE id = ?');
                $stmt->execute([$status, $notes, $id]);
            } else {
                $stmt = $pdo->prepare('UPDATE property_reports SET status = ? WHERE id = ?');
                $stmt->execute([$status, $id]);
            }
        } else {
            $allowed = ['open', 'in_review', 'resolved', 'escalated'];
            if (!in_array($status, $allowed, true)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid status for dispute']);
                exit;
            }
            if (array_key_exists('admin_notes', $input)) {
                $stmt = $pdo->prepare('UPDATE disputes SET status = ?, resolution_notes = ? WHERE id = ?');
                $stmt->execute([$status, $notes, $id]);
            } else {
                $stmt = $pdo->prepare('UPDATE disputes SET status = ? WHERE id = ?');
                $stmt->execute([$status, $id]);
            }
        }

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Record not found']);
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'Updated']);
    } catch (\PDOException $e) {
        error_log('Admin reports patch error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
