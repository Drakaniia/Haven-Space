<?php
/**
 * Payment Overview API
 * GET /api/payments/overview - Get payment overview statistics for current user
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Authenticate user
$user = Middleware::authenticate();
$userId = $user['user_id'];
$userRole = $user['role'];

$method = $_SERVER['REQUEST_METHOD'];

// GET - Get payment overview
if ($method === 'GET') {
    try {
        error_log("Payment overview API called for user ID: $userId, role: $userRole");
        $pdo = Connection::getInstance()->getPdo();
        error_log("Database connection established");
        
        if ($userRole === 'boarder') {
            // Get active application/lease
            $appStmt = $pdo->prepare("
                SELECT 
                    a.id,
                    r.id as room_id,
                    r.price,
                    r.title as room_title,
                    r.room_number,
                    p.id as property_id,
                    p.title as property_name,
                    a.created_at
                FROM applications a
                JOIN rooms r ON a.room_id = r.id
                JOIN properties p ON a.property_id = p.id
                WHERE a.boarder_id = ? AND a.status = 'accepted' AND a.deleted_at IS NULL
                LIMIT 1
            ");
            $appStmt->execute([$userId]);
            $application = $appStmt->fetch(PDO::FETCH_ASSOC);

            if (!$application) {
                // Return mock data if no application exists
                json_response(200, [
                    'success' => true,
                    'data' => [
                        'total_paid' => 22000.00,
                        'months_paid' => 4,
                        'next_payment_amount' => 5500.00,
                        'next_payment_date' => date('Y-m-01', strtotime('+1 month')),
                        'days_until_due' => 12,
                        'utility_balance' => 142.50,
                        'utility_days_remaining' => 3,
                        'security_deposit' => 11000.00,
                        'current_bill' => [
                            'id' => null,
                            'period' => date('F Y'),
                            'base_rent' => 5000.00,
                            'utilities' => 350.00,
                            'wifi' => 150.00,
                            'late_fee' => 0.00,
                            'total' => 5500.00,
                            'due_date' => date('Y-m-01', strtotime('+1 month')),
                            'status' => 'pending'
                        ],
                        'room_info' => [
                            'property_name' => 'Sample Property',
                            'room_title' => 'Sample Room',
                            'room_number' => '101'
                        ]
                    ]
                ]);
                exit;
            }

            $roomPrice = floatval($application['price']);
            $roomId = $application['room_id'];

            // Calculate total paid
            $paidStmt = $pdo->prepare("
                SELECT 
                    COALESCE(SUM(amount), 0) as total_paid,
                    COUNT(*) as months_paid
                FROM payments
                WHERE boarder_id = ? AND status = 'paid'
            ");
            $paidStmt->execute([$userId]);
            $paidData = $paidStmt->fetch(PDO::FETCH_ASSOC);

            // Get next payment (current month or upcoming)
            $nextPaymentStmt = $pdo->prepare("
                SELECT 
                    id,
                    amount,
                    due_date,
                    status,
                    late_fee
                FROM payments
                WHERE boarder_id = ? AND status IN ('pending', 'overdue')
                ORDER BY due_date ASC
                LIMIT 1
            ");
            $nextPaymentStmt->execute([$userId]);
            $nextPayment = $nextPaymentStmt->fetch(PDO::FETCH_ASSOC);

            // If no payment record exists, create one for current month
            if (!$nextPayment) {
                $currentMonthDue = date('Y-m-01'); // First day of current month
                $today = date('Y-m-d');
                
                // Check if we should create a payment record
                if ($application['created_at'] && strtotime($application['created_at']) <= strtotime($today)) {
                    // Insert payment for current month
                    $insertStmt = $pdo->prepare("
                        INSERT INTO payments (boarder_id, landlord_id, room_id, property_id, amount, due_date, status)
                        SELECT ?, p.landlord_id, ?, ?, ?, ?, 'pending'
                        FROM properties p
                        WHERE p.id = ?
                    ");
                    $insertStmt->execute([
                        $userId,
                        $roomId,
                        $application['property_id'],
                        $roomPrice,
                        $currentMonthDue,
                        $application['property_id']
                    ]);
                    
                    // Fetch the newly created payment
                    $nextPaymentStmt->execute([$userId]);
                    $nextPayment = $nextPaymentStmt->fetch(PDO::FETCH_ASSOC);
                }
            }

            $nextPaymentAmount = $nextPayment ? floatval($nextPayment['amount']) + floatval($nextPayment['late_fee'] ?? 0) : $roomPrice;
            $nextPaymentDate = $nextPayment ? $nextPayment['due_date'] : date('Y-m-01');
            
            // Calculate days until due
            $daysUntilDue = null;
            if ($nextPaymentDate) {
                $today = new DateTime();
                $dueDate = new DateTime($nextPaymentDate);
                $interval = $today->diff($dueDate);
                $daysUntilDue = $interval->invert ? -$interval->days : $interval->days;
            }

            // Mock utility balance (can be enhanced later with actual utility tracking)
            $utilityBalance = 142.50;
            $utilityDaysRemaining = 3;

            // Security deposit (typically 2 months rent)
            $securityDeposit = $roomPrice * 2;

            // Get current bill breakdown
            $currentBill = null;
            if ($nextPayment) {
                $currentBill = [
                    'id' => intval($nextPayment['id']),
                    'period' => date('F Y', strtotime($nextPayment['due_date'])),
                    'base_rent' => $roomPrice,
                    'utilities' => 350.00, // Mock data
                    'wifi' => 150.00, // Mock data
                    'late_fee' => floatval($nextPayment['late_fee'] ?? 0),
                    'total' => $nextPaymentAmount,
                    'due_date' => $nextPayment['due_date'],
                    'status' => $nextPayment['status']
                ];
            }

            json_response(200, [
                'success' => true,
                'data' => [
                    'total_paid' => floatval($paidData['total_paid']),
                    'months_paid' => intval($paidData['months_paid']),
                    'next_payment_amount' => $nextPaymentAmount,
                    'next_payment_date' => $nextPaymentDate,
                    'days_until_due' => $daysUntilDue,
                    'utility_balance' => $utilityBalance,
                    'utility_days_remaining' => $utilityDaysRemaining,
                    'security_deposit' => $securityDeposit,
                    'current_bill' => $currentBill,
                    'room_info' => [
                        'property_name' => htmlspecialchars($application['property_name']),
                        'room_title' => htmlspecialchars($application['room_title']),
                        'room_number' => $application['room_number']
                    ]
                ]
            ]);

        } else {
            json_response(403, ['error' => 'Only boarders can access payment overview']);
        }

    } catch (Exception $e) {
        error_log('Get payment overview error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        json_response(500, ['error' => 'Failed to load payment overview', 'message' => $e->getMessage()]);
    }
}

// Method not allowed
json_response(405, ['error' => 'Method not allowed']);
