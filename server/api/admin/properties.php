<?php
/**
 * Admin — property listing moderation
 *
 * GET  ?moderation=pending_review|published|rejected|all
 * POST { propertyId, action: "publish"|"reject"|"flag", adminNotes? }
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
    $mod = $_GET['moderation'] ?? 'pending_review';

    $allowed = ['pending_review', 'published', 'rejected', 'all'];
    if (!in_array($mod, $allowed, true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid moderation filter']);
        exit;
    }

    try {
        if ($mod === 'all') {
            $stmt = $pdo->query(
                "SELECT p.*, u.first_name AS landlord_first, u.last_name AS landlord_last, u.email AS landlord_email
                 FROM properties p
                 JOIN users u ON u.id = p.landlord_id
                 ORDER BY p.updated_at DESC"
            );
        } else {
            $stmt = $pdo->prepare(
                "SELECT p.*, u.first_name AS landlord_first, u.last_name AS landlord_last, u.email AS landlord_email
                 FROM properties p
                 JOIN users u ON u.id = p.landlord_id
                 WHERE p.listing_moderation_status = ?
                 ORDER BY p.updated_at DESC"
            );
            $stmt->execute([$mod]);
        }

        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (\PDOException $e) {
        error_log('Admin properties list error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to list properties']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $propertyId = isset($input['propertyId']) ? (int) $input['propertyId'] : 0;
    $action = $input['action'] ?? '';

    if ($propertyId < 1 || !in_array($action, ['publish', 'reject', 'flag'], true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid propertyId or action']);
        exit;
    }

    if ($action === 'publish') {
        $newStatus = 'published';
    } elseif ($action === 'reject') {
        $newStatus = 'rejected';
    } else {
        $newStatus = 'pending_review';
    }

    try {
        $stmt = $pdo->prepare('SELECT id, title FROM properties WHERE id = ?');
        $stmt->execute([$propertyId]);
        $prop = $stmt->fetch();
        if (!$prop) {
            http_response_code(404);
            echo json_encode(['error' => 'Property not found']);
            exit;
        }

        $stmt = $pdo->prepare('UPDATE properties SET listing_moderation_status = ? WHERE id = ?');
        $stmt->execute([$newStatus, $propertyId]);

        $messages = [
            'publish' => 'Listing published',
            'reject' => 'Listing rejected',
            'flag' => 'Listing flagged for review',
        ];
        echo json_encode([
            'success' => true,
            'message' => $messages[$action],
            'property' => ['id' => $propertyId, 'listing_moderation_status' => $newStatus],
        ]);
    } catch (\PDOException $e) {
        error_log('Admin properties post error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update property']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
