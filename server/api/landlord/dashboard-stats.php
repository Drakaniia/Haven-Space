<?php

/**
 * Landlord Dashboard Stats API
 * GET /api/landlord/dashboard/stats
 *
 * Returns dashboard statistics for the logged-in landlord:
 * - Occupancy rate
 * - Monthly revenue
 * - Upcoming renewals
 * - Payment alerts (due soon, overdue)
 */

// CORS headers must be set before any output
require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

// Authenticate user and authorize as landlord
$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

try {
    $pdo = Connection::getInstance()->getPdo();

    // 1. Calculate Occupancy Rate
    // Get total rooms and occupied rooms for this landlord
    $stmt = $pdo->prepare("
        SELECT
            COUNT(*) as total_rooms,
            COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms
        FROM rooms r
        INNER JOIN properties p ON r.property_id = p.id
        WHERE p.landlord_id = ? AND p.deleted_at IS NULL
    ");
    $stmt->execute([$landlordId]);
    $roomStats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $totalRooms = intval($roomStats['total_rooms']);
    $occupiedRooms = intval($roomStats['occupied_rooms']);
    $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

    // Calculate previous month occupancy rate for trend
    // (simplified - in production, you'd track historical data)
    $occupancyTrend = 12; // Placeholder - would come from historical data

    // 2. Calculate Monthly Revenue
    // Sum of all payments received this month
    // TODO: Create payments table and implement this query
    // For now, calculate from approved applications with expected rent
    $stmt = $pdo->prepare("
        SELECT 
            COALESCE(SUM(r.price), 0) as monthly_revenue
        FROM applications a
        INNER JOIN rooms r ON a.room_id = r.id
        INNER JOIN properties p ON r.property_id = p.id
        WHERE a.landlord_id = ? 
            AND a.status = 'approved'
            AND p.deleted_at IS NULL
            AND MONTH(a.updated_at) = MONTH(CURRENT_DATE())
            AND YEAR(a.updated_at) = YEAR(CURRENT_DATE())
    ");
    $stmt->execute([$landlordId]);
    $revenueData = $stmt->fetch(PDO::FETCH_ASSOC);
    $monthlyRevenue = floatval($revenueData['monthly_revenue']);

    // Placeholder revenue trend (would come from comparing with previous month)
    $revenueTrend = 8;

    // 3. Calculate Upcoming Renewals
    // Count applications/leases expiring within next 30 days
    // TODO: Create leases/contracts table with end_date
    // For now, count approved applications (placeholder)
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as upcoming_renewals
        FROM applications a
        INNER JOIN properties p ON a.property_id = p.id
        WHERE a.landlord_id = ? 
            AND a.status = 'approved'
            AND p.deleted_at IS NULL
    ");
    $stmt->execute([$landlordId]);
    $renewalsData = $stmt->fetch(PDO::FETCH_ASSOC);
    $upcomingRenewals = intval($renewalsData['upcoming_renewals']);

    // 4. Calculate Payment Alerts
    // Count payments due soon (within 7 days) and overdue
    // TODO: Create payments table with due_date and status
    // For now, return placeholder values
    $dueSoon = 2; // Placeholder
    $overdue = 1; // Placeholder

    json_response(200, [
        'data' => [
            'occupancy' => [
                'rate' => $occupancyRate,
                'total_rooms' => $totalRooms,
                'occupied_rooms' => $occupiedRooms,
                'trend' => $occupancyTrend,
            ],
            'revenue' => [
                'monthly' => $monthlyRevenue,
                'currency' => 'PHP',
                'trend' => $revenueTrend,
            ],
            'renewals' => [
                'upcoming_count' => $upcomingRenewals,
                'period' => 'This month',
            ],
            'payment_alerts' => [
                'due_soon' => $dueSoon,
                'overdue' => $overdue,
            ],
        ],
    ]);

} catch (Exception $e) {
    error_log('Landlord dashboard stats error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to load dashboard statistics']);
}
