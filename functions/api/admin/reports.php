<?php

/**
 * Admin Reports API
 * GET /api/admin/reports.php
 * PATCH /api/admin/reports.php {kind, id, status}
 *
 * Manages property reports and disputes
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
    error_log('Admin reports error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to process request']);
}

function handleGet($pdo) {
    // Get property reports
    $stmt = $pdo->query("
        SELECT 
            pr.id, pr.reason, pr.status, pr.created_at,
            p.title as property_title,
            u.email as reporter_email
        FROM property_reports pr
        JOIN properties p ON pr.property_id = p.id
        JOIN users u ON pr.reporter_id = u.id
        WHERE pr.deleted_at IS NULL
        ORDER BY pr.created_at DESC
        LIMIT 100
    ");
    $propertyReports = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get disputes
    $stmt = $pdo->query("
        SELECT 
            d.id, d.title, d.type, d.status, d.created_at,
            u.email as opened_by_email
        FROM disputes d
        JOIN users u ON d.opened_by = u.id
        WHERE d.deleted_at IS NULL
        ORDER BY d.created_at DESC
        LIMIT 100
    ");
    $disputes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_response(200, [
        'data' => [
            'property_reports' => $propertyReports,
            'disputes' => $disputes,
        ],
    ]);
}

function handlePatch($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['kind']) || !isset($input['id']) || !isset($input['status'])) {
        json_response(400, ['error' => 'Missing required fields: kind, id, status']);
    }

    $kind = $input['kind']; // 'report' or 'dispute'
    $id = intval($input['id']);
    $status = $input['status'];

    if ($kind === 'report') {
        $allowedStatuses = ['open', 'reviewing', 'resolved', 'dismissed'];
        if (!in_array($status, $allowedStatuses)) {
            json_response(400, ['error' => 'Invalid status for report']);
        }

        $stmt = $pdo->prepare("UPDATE property_reports SET status = ? WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$status, $id]);
    } elseif ($kind === 'dispute') {
        $allowedStatuses = ['open', 'in_review', 'resolved', 'escalated'];
        if (!in_array($status, $allowedStatuses)) {
            json_response(400, ['error' => 'Invalid status for dispute']);
        }

        $stmt = $pdo->prepare("UPDATE disputes SET status = ? WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$status, $id]);
    } else {
        json_response(400, ['error' => 'Invalid kind. Use report or dispute']);
    }

    if ($stmt->rowCount() === 0) {
        json_response(404, ['error' => ucfirst($kind) . ' not found']);
    }

    json_response(200, ['message' => ucfirst($kind) . ' status updated successfully']);
}
