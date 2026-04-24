<?php

/**
 * Admin Properties API
 * GET /api/admin/properties.php?moderation=pending_review
 * POST /api/admin/properties.php {propertyId, action}
 *
 * Manages property moderation (publish, reject, flag)
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
        case 'POST':
            handlePost($pdo);
            break;
        default:
            json_response(405, ['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    error_log('Admin properties error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to process request']);
}

function handleGet($pdo) {
    $moderationStatus = $_GET['moderation'] ?? 'pending_review';

    $stmt = $pdo->prepare("
        SELECT 
            p.id, p.title, p.price, p.moderation_status as listing_moderation_status,
            u.first_name as landlord_first, u.last_name as landlord_last, u.email as landlord_email
        FROM properties p
        JOIN users u ON p.landlord_id = u.id
        WHERE p.moderation_status = ? AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC
        LIMIT 100
    ");
    $stmt->execute([$moderationStatus]);
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_response(200, ['data' => $properties]);
}

function handlePost($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['propertyId']) || !isset($input['action'])) {
        json_response(400, ['error' => 'Missing required fields: propertyId, action']);
    }

    $propertyId = intval($input['propertyId']);
    $action = $input['action']; // 'publish', 'reject', 'flag'

    $newStatus = match($action) {
        'publish' => 'published',
        'reject' => 'rejected',
        'flag' => 'flagged',
        default => null
    };

    if (!$newStatus) {
        json_response(400, ['error' => 'Invalid action. Use publish, reject, or flag']);
    }

    $stmt = $pdo->prepare("UPDATE properties SET moderation_status = ? WHERE id = ? AND deleted_at IS NULL");
    $stmt->execute([$newStatus, $propertyId]);

    if ($stmt->rowCount() === 0) {
        json_response(404, ['error' => 'Property not found']);
    }

    json_response(200, ['message' => 'Property moderation status updated successfully']);
}
