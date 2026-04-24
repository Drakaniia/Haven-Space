<?php

/**
 * Admin Summary API
 * GET /api/admin/summary.php
 * 
 * Returns summary statistics for the Super Admin dashboard
 */

// This file is dispatched through routes.php which handles bootstrap, CORS, and routing
// For direct file access, we need to load dependencies
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
    
    // Get user counts by role
    $stmt = $pdo->query("
        SELECT
            COUNT(*) as total,
            COALESCE(SUM(CASE WHEN u.role_id = 1 THEN 1 ELSE 0 END), 0) as boarder,
            COALESCE(SUM(CASE WHEN u.role_id = 2 THEN 1 ELSE 0 END), 0) as landlord,
            COALESCE(SUM(CASE WHEN u.role_id = 3 THEN 1 ELSE 0 END), 0) as admin
        FROM users u
        WHERE u.deleted_at IS NULL
    ");
    $userCounts = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get landlord verification counts
    $stmt = $pdo->query("
        SELECT COUNT(*) as pending
        FROM users u
        WHERE u.role_id = 2 
            AND u.is_verified = 0 
            AND u.deleted_at IS NULL
    ");
    $landlordsPending = $stmt->fetch(PDO::FETCH_ASSOC)['pending'];
    
    // Get property counts
    $stmt = $pdo->query("
        SELECT
            COUNT(*) as total,
            COALESCE(SUM(CASE WHEN moderation_status = 'pending_review' THEN 1 ELSE 0 END), 0) as pending_moderation,
            COALESCE(SUM(CASE WHEN moderation_status = 'published' THEN 1 ELSE 0 END), 0) as published,
            COALESCE(SUM(CASE WHEN moderation_status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected
        FROM properties
        WHERE deleted_at IS NULL
    ");
    $propertyCounts = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get application counts
    $stmt = $pdo->query("
        SELECT
            COUNT(*) as total,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) as approved,
            COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected
        FROM applications
        WHERE deleted_at IS NULL
    ");
    $applicationCounts = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get report counts
    $stmt = $pdo->query("
        SELECT COUNT(*) as open
        FROM property_reports
        WHERE status IN ('open', 'reviewing')
    ");
    $openReports = $stmt->fetch(PDO::FETCH_ASSOC)['open'];
    
    // Get dispute counts
    $stmt = $pdo->query("
        SELECT COUNT(*) as open
        FROM disputes
        WHERE status = 'open'
    ");
    $openDisputes = $stmt->fetch(PDO::FETCH_ASSOC)['open'];
    
    // Get platform fee from settings
    $stmt = $pdo->query("
        SELECT setting_value FROM platform_settings
        WHERE setting_key = 'platform_fee_percent'
        LIMIT 1
    ");
    $platformFee = $stmt->fetch(PDO::FETCH_ASSOC);
    $platformFeePercent = $platformFee ? floatval($platformFee['setting_value']) : 5.0;
    
    json_response(200, [
        'data' => [
            'counts' => [
                'users_total' => intval($userCounts['total']),
                'users_boarder' => intval($userCounts['boarder']),
                'users_landlord' => intval($userCounts['landlord']),
                'users_admin' => intval($userCounts['admin']),
                'landlords_pending_verification' => intval($landlordsPending),
                'properties_total' => intval($propertyCounts['total']),
                'properties_pending_moderation' => intval($propertyCounts['pending_moderation']),
                'applications_total' => intval($applicationCounts['total']),
                'property_reports_open' => intval($openReports),
                'disputes_open' => intval($openDisputes),
            ],
            'revenue' => [
                'platform_fee_percent' => $platformFeePercent,
                'currency' => 'PHP',
                'note' => 'Platform fee is charged on each successful booking.',
            ],
        ],
    ]);
    
} catch (Exception $e) {
    error_log('Admin summary error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to load summary statistics']);
}
