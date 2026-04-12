<?php
/**
 * Admin dashboard KPI summary
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

header('Content-Type: application/json');

use App\Api\Middleware;
use App\Core\Database\Connection;

Middleware::authorize(['admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$pdo = Connection::getInstance()->getPdo();

try {
    $counts = [];
    $counts['users_total'] = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $counts['users_boarder'] = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'boarder'")->fetchColumn();
    $counts['users_landlord'] = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'landlord'")->fetchColumn();
    $counts['users_admin'] = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
    $counts['landlords_pending_verification'] = (int) $pdo->query(
        "SELECT COUNT(*) FROM users WHERE role = 'landlord' AND is_verified = 0"
    )->fetchColumn();
    $counts['properties_total'] = (int) $pdo->query('SELECT COUNT(*) FROM properties')->fetchColumn();
    $counts['properties_pending_moderation'] = (int) $pdo->query(
        "SELECT COUNT(*) FROM properties WHERE listing_moderation_status = 'pending_review'"
    )->fetchColumn();
    $counts['applications_total'] = (int) $pdo->query('SELECT COUNT(*) FROM applications')->fetchColumn();
    $counts['applications_pending'] = (int) $pdo->query(
        "SELECT COUNT(*) FROM applications WHERE status = 'pending'"
    )->fetchColumn();
    $counts['property_reports_open'] = (int) $pdo->query(
        "SELECT COUNT(*) FROM property_reports WHERE status IN ('open', 'reviewing')"
    )->fetchColumn();
    $counts['disputes_open'] = (int) $pdo->query(
        "SELECT COUNT(*) FROM disputes WHERE status IN ('open', 'in_review')"
    )->fetchColumn();

    $feeRow = $pdo->query(
        "SELECT setting_value FROM platform_settings WHERE setting_key = 'platform_fee_percent'"
    )->fetch();
    $feePercent = (float) ($feeRow['setting_value'] ?? 0);
    $revenueDisplay = [
        'currency' => 'PHP',
        'platform_fee_percent' => $feePercent,
        'note' => 'Revenue metrics are placeholder until payment ledger is integrated.',
        'estimated_monthly_php' => 0,
    ];

    echo json_encode([
        'success' => true,
        'data' => [
            'counts' => $counts,
            'revenue' => $revenueDisplay,
        ],
    ]);
} catch (\PDOException $e) {
    error_log('Admin summary error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load summary', 'detail' => $e->getMessage()]);
}
