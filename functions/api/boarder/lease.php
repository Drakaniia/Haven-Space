<?php
/**
 * Boarder Lease API
 * GET /api/boarder/lease - Get current lease information for boarder
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Authenticate user and authorize as boarder
$user = Middleware::authorize(['boarder']);
$boarderId = $user['user_id'];

// Log for debugging
error_log("Lease API: Boarder ID $boarderId requesting lease information");

$method = $_SERVER['REQUEST_METHOD'];

// GET - Get current lease information
if ($method === 'GET') {
    try {
        $pdo = Connection::getInstance()->getPdo();

        // Get active lease information from accepted applications
        $stmt = $pdo->prepare("
            SELECT 
                a.id as application_id,
                a.created_at as lease_start_date,
                DATE_ADD(a.created_at, INTERVAL 12 MONTH) as end_date,
                TIMESTAMPDIFF(MONTH, a.created_at, NOW()) as current_month,
                12 as total_months,
                DATEDIFF(DATE_ADD(a.created_at, INTERVAL 12 MONTH), NOW()) as days_until_end,
                p.id as property_id,
                p.title as property_name,
                addr.address_line_1 as address,
                r.id as room_id,
                r.title as room_title,
                r.room_number,
                r.price as monthly_rent,
                0 as outstanding_balance,
                0 as current_utilities,
                0 as electricity_cost,
                0 as water_cost,
                r.price as next_payment_amount,
                DATE_ADD(LAST_DAY(NOW()), INTERVAL 1 DAY) as next_payment_date,
                DATEDIFF(DATE_ADD(LAST_DAY(NOW()), INTERVAL 1 DAY), NOW()) as days_until_payment
            FROM applications a
            JOIN properties p ON a.property_id = p.id
            JOIN addresses addr ON p.address_id = addr.id
            JOIN rooms r ON a.room_id = r.id
            WHERE a.boarder_id = ? 
            AND a.status = 'accepted' 
            AND a.deleted_at IS NULL
            ORDER BY a.created_at DESC
            LIMIT 1
        ");
        
        $stmt->execute([$boarderId]);
        $lease = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lease) {
            error_log("Lease API: No accepted application found for boarder ID $boarderId");
            json_response(200, [
                'success' => true,
                'data' => null,
                'message' => 'No active lease found'
            ]);
            return;
        }

        error_log("Lease API: Found lease for boarder ID $boarderId - Application ID {$lease['application_id']}");

        // Transform data
        $leaseData = [
            'application_id' => intval($lease['application_id']),
            'property_id' => intval($lease['property_id']),
            'property_name' => htmlspecialchars($lease['property_name']),
            'address' => htmlspecialchars($lease['address']),
            'room_id' => intval($lease['room_id']),
            'room_title' => htmlspecialchars($lease['room_title']),
            'room_number' => $lease['room_number'],
            'lease_start_date' => $lease['lease_start_date'],
            'end_date' => $lease['end_date'],
            'current_month' => intval($lease['current_month']) + 1, // Add 1 because we're in the current month
            'total_months' => intval($lease['total_months']),
            'days_until_end' => intval($lease['days_until_end']),
            'monthly_rent' => floatval($lease['monthly_rent']),
            'outstanding_balance' => floatval($lease['outstanding_balance']),
            'current_utilities' => floatval($lease['current_utilities']),
            'electricity_cost' => floatval($lease['electricity_cost']),
            'water_cost' => floatval($lease['water_cost']),
            'next_payment_amount' => floatval($lease['next_payment_amount']),
            'next_payment_date' => $lease['next_payment_date'],
            'days_until_payment' => intval($lease['days_until_payment'])
        ];

        json_response(200, [
            'success' => true,
            'data' => $leaseData
        ]);

    } catch (Exception $e) {
        error_log('Get boarder lease error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to load lease information']);
    }
}

// Method not allowed
json_response(405, ['error' => 'Method not allowed']);
