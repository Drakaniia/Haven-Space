<?php

/**
 * Admin Applications API
 * GET /api/admin/applications.php
 *
 * Returns application statistics and list for admin oversight
 */

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
    require_once __DIR__ . '/../cors.php';
}

use App\Core\Database\Connection;

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

try {
    $pdo = Connection::getInstance()->getPdo();

    // Get application statistics
    $stmt = $pdo->query("
        SELECT
            COUNT(*) as total,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) as approved,
            COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected
        FROM applications
        WHERE deleted_at IS NULL
    ");
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    // Calculate processed rate
    $total = intval($stats['total']);
    $processed = intval($stats['approved']) + intval($stats['rejected']);
    $processedRate = $total > 0 ? round(($processed / $total) * 100, 1) : 0;
    $stats['processed_rate_percent'] = $processedRate;

    // Get application status breakdown for analytics
    $stmt = $pdo->query("
        SELECT status, COUNT(*) as count
        FROM applications
        WHERE deleted_at IS NULL
        GROUP BY status
    ");
    $byStatus = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    $stats['by_status'] = $byStatus;

    // Get recent applications
    $stmt = $pdo->query("
        SELECT 
            a.id, a.status, a.created_at,
            bf.first_name as boarder_first, bf.last_name as boarder_last, bf.email as boarder_email,
            lf.first_name as landlord_first, lf.last_name as landlord_last,
            r.title as room_title
        FROM applications a
        JOIN users bf ON a.boarder_id = bf.id
        JOIN rooms r ON a.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        JOIN users lf ON p.landlord_id = lf.id
        WHERE a.deleted_at IS NULL
        ORDER BY a.created_at DESC
        LIMIT 100
    ");
    $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_response(200, [
        'data' => [
            'stats' => $stats,
            'applications' => $applications,
        ],
    ]);

} catch (Exception $e) {
    error_log('Admin applications error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to load applications']);
}
