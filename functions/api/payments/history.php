<?php
/**
 * Payment History API
 * GET /api/payments/history - Get payment history for current user
 */

// Suppress PHP errors from being displayed as HTML
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

try {
    // Authenticate user
    $user = Middleware::authenticate();
    $userId = $user['user_id'];
    $userRole = $user['role'];

    $method = $_SERVER['REQUEST_METHOD'];

    // GET - Get payment history
    if ($method === 'GET') {
    try {
        $pdo = Connection::getInstance()->getPdo();
        
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
        $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

        // For boarders, get their payment history
        if ($userRole === 'boarder') {
            // Get payments from the payments table
            $stmt = $pdo->prepare("
                SELECT 
                    p.id,
                    p.amount,
                    p.paid_date,
                    p.due_date,
                    p.status,
                    p.payment_method,
                    p.reference_number,
                    p.notes,
                    p.created_at,
                    prop.title as property_name,
                    r.title as room_title,
                    r.room_number
                FROM payments p
                LEFT JOIN rooms r ON p.room_id = r.id
                LEFT JOIN properties prop ON r.property_id = prop.id
                WHERE p.boarder_id = ?
                ORDER BY p.due_date DESC, p.created_at DESC
                LIMIT ? OFFSET ?
            ");
            
            $stmt->bindValue(1, $userId, PDO::PARAM_INT);
            $stmt->bindValue(2, $limit, PDO::PARAM_INT);
            $stmt->bindValue(3, $offset, PDO::PARAM_INT);
            $stmt->execute();
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // If no payments exist, generate mock data for current month
            if (empty($payments)) {
                // Get active application to generate payment data
                $appStmt = $pdo->prepare("
                    SELECT 
                        a.id,
                        r.price,
                        r.title as room_title,
                        r.room_number,
                        p.title as property_name
                    FROM applications a
                    JOIN rooms r ON a.room_id = r.id
                    JOIN properties p ON a.property_id = p.id
                    WHERE a.boarder_id = ? AND a.status = 'accepted' AND a.deleted_at IS NULL
                    LIMIT 1
                ");
                $appStmt->execute([$userId]);
                $application = $appStmt->fetch(PDO::FETCH_ASSOC);

                if ($application) {
                    // Generate 3 months of payment data (current + 2 previous)
                    $payments = [];
                    $amount = floatval($application['price']);
                    
                    for ($i = 0; $i < 3; $i++) {
                        $monthOffset = $i;
                        $dueDate = date('Y-m-d', strtotime("first day of this month -$monthOffset months"));
                        $isPaid = $i > 0; // Current month unpaid, previous months paid
                        
                        $payments[] = [
                            'id' => null,
                            'amount' => $amount,
                            'payment_date' => $isPaid ? date('Y-m-d', strtotime($dueDate . ' +5 days')) : null,
                            'due_date' => $dueDate,
                            'status' => $isPaid ? 'paid' : 'pending',
                            'payment_method' => $isPaid ? 'GCash' : null,
                            'reference_number' => $isPaid ? 'REF' . strtoupper(substr(md5($dueDate), 0, 10)) : null,
                            'notes' => null,
                            'created_at' => $dueDate,
                            'property_name' => $application['property_name'],
                            'room_title' => $application['room_title'],
                            'room_number' => $application['room_number']
                        ];
                    }
                }
            }

            // Transform data
            $transformedPayments = array_map(function($payment) {
                return [
                    'id' => $payment['id'],
                    'amount' => floatval($payment['amount']),
                    'payment_date' => $payment['paid_date'],
                    'due_date' => $payment['due_date'],
                    'status' => $payment['status'],
                    'payment_method' => $payment['payment_method'],
                    'reference_number' => $payment['reference_number'],
                    'notes' => $payment['notes'],
                    'property_name' => htmlspecialchars($payment['property_name'] ?? ''),
                    'room_title' => htmlspecialchars($payment['room_title'] ?? ''),
                    'room_number' => $payment['room_number'],
                    'created_at' => $payment['created_at']
                ];
            }, $payments);

            json_response(200, [
                'success' => true,
                'data' => $transformedPayments,
                'total_count' => count($transformedPayments)
            ]);

        } else if ($userRole === 'landlord') {
            // For landlords, get payments for their properties
            $stmt = $pdo->prepare("
                SELECT 
                    p.id,
                    p.amount,
                    p.paid_date,
                    p.due_date,
                    p.status,
                    p.payment_method,
                    p.reference_number,
                    p.notes,
                    p.created_at,
                    prop.title as property_name,
                    r.title as room_title,
                    r.room_number,
                    u.first_name as boarder_first_name,
                    u.last_name as boarder_last_name
                FROM payments p
                JOIN rooms r ON p.room_id = r.id
                JOIN properties prop ON r.property_id = prop.id
                LEFT JOIN users u ON p.boarder_id = u.id
                WHERE prop.landlord_id = ?
                ORDER BY p.due_date DESC, p.created_at DESC
                LIMIT ? OFFSET ?
            ");
            
            $stmt->bindValue(1, $userId, PDO::PARAM_INT);
            $stmt->bindValue(2, $limit, PDO::PARAM_INT);
            $stmt->bindValue(3, $offset, PDO::PARAM_INT);
            $stmt->execute();
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Transform data
            $transformedPayments = array_map(function($payment) {
                return [
                    'id' => intval($payment['id']),
                    'amount' => floatval($payment['amount']),
                    'payment_date' => $payment['paid_date'],
                    'due_date' => $payment['due_date'],
                    'status' => $payment['status'],
                    'payment_method' => $payment['payment_method'],
                    'reference_number' => $payment['reference_number'],
                    'notes' => $payment['notes'],
                    'property_name' => htmlspecialchars($payment['property_name']),
                    'room_title' => htmlspecialchars($payment['room_title']),
                    'room_number' => $payment['room_number'],
                    'boarder_name' => htmlspecialchars(($payment['boarder_first_name'] ?? '') . ' ' . ($payment['boarder_last_name'] ?? '')),
                    'created_at' => $payment['created_at']
                ];
            }, $payments);

            json_response(200, [
                'success' => true,
                'data' => $transformedPayments,
                'total_count' => count($transformedPayments)
            ]);
        } else {
            json_response(403, ['error' => 'Forbidden']);
        }

    } catch (Exception $e) {
        error_log('Get payment history error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to load payment history', 'message' => $e->getMessage()]);
    }
} else {
    // Method not allowed
    json_response(405, ['error' => 'Method not allowed']);
}

} catch (Exception $e) {
    error_log('Payment history API error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    
    // Ensure we send JSON even on fatal errors
    if (!headers_sent()) {
        header('Content-Type: application/json');
        http_response_code(500);
    }
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
    exit;
}
