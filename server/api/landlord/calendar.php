<?php
/**
 * Landlord Calendar API
 * Provides calendar events including payments, lease events, and maintenance schedules
 */

require_once __DIR__ . '/../../src/Core/Database.php';
require_once __DIR__ . '/../middleware.php';

use App\Core\Database;

header('Content-Type: application/json');

// Authenticate user
$user = authenticate();

if (!$user || $user['role'] !== 'landlord') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized access']);
    exit;
}

$landlordId = $user['id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    getCalendarEvents($landlordId);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

/**
 * Get calendar events for landlord
 */
function getCalendarEvents($landlordId) {
    try {
        $pdo = Database::getInstance()->getConnection();
        
        // Get query parameters for date filtering
        $startDate = $_GET['start_date'] ?? date('Y-m-01'); // Default to first day of current month
        $endDate = $_GET['end_date'] ?? date('Y-m-t', strtotime('+2 months')); // Default to 3 months ahead
        
        $events = [];
        
        // 1. Get Payment Events (due dates)
        $stmt = $pdo->prepare("
            SELECT 
                p.id,
                p.due_date as event_date,
                p.amount,
                p.status,
                p.payment_method,
                p.paid_date,
                CONCAT(u.first_name, ' ', u.last_name) as boarder_name,
                r.title as room_name,
                pr.title as property_name
            FROM payments p
            INNER JOIN users u ON p.boarder_id = u.id
            INNER JOIN rooms r ON p.room_id = r.id
            INNER JOIN properties pr ON p.property_id = pr.id
            WHERE p.landlord_id = :landlord_id
            AND p.due_date BETWEEN :start_date AND :end_date
            AND p.status IN ('pending', 'overdue', 'paid')
            ORDER BY p.due_date ASC
        ");
        $stmt->execute([
            'landlord_id' => $landlordId,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($payments as $payment) {
            $color = 'green';
            $title = 'Rent Due - ' . $payment['boarder_name'];
            
            if ($payment['status'] === 'overdue') {
                $color = 'red';
                $title = 'Overdue Payment - ' . $payment['boarder_name'];
            } elseif ($payment['status'] === 'paid') {
                $color = 'green';
                $title = 'Payment Received - ' . $payment['boarder_name'];
            }
            
            $events[] = [
                'id' => 'payment_' . $payment['id'],
                'title' => $title,
                'date' => $payment['event_date'],
                'type' => 'payment',
                'color' => $color,
                'description' => 'Monthly rent payment of ₱' . number_format($payment['amount'], 2) . ' for ' . $payment['property_name'] . ' - ' . $payment['room_name'],
                'tenant' => $payment['boarder_name'],
                'property' => $payment['property_name'] . ' - ' . $payment['room_name'],
                'amount' => '₱' . number_format($payment['amount'], 2),
                'status' => $payment['status'],
                'payment_method' => $payment['payment_method'],
                'paid_date' => $payment['paid_date']
            ];
        }
        
        // 2. Get Lease Events (application accepted dates as lease start)
        $stmt = $pdo->prepare("
            SELECT 
                a.id,
                a.created_at as event_date,
                a.status,
                CONCAT(u.first_name, ' ', u.last_name) as boarder_name,
                r.title as room_name,
                pr.title as property_name
            FROM applications a
            INNER JOIN users u ON a.boarder_id = u.id
            INNER JOIN rooms r ON a.room_id = r.id
            INNER JOIN properties pr ON r.property_id = pr.id
            WHERE a.landlord_id = :landlord_id
            AND a.status = 'accepted'
            AND DATE(a.created_at) BETWEEN :start_date AND :end_date
            ORDER BY a.created_at ASC
        ");
        $stmt->execute([
            'landlord_id' => $landlordId,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        $leases = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($leases as $lease) {
            $events[] = [
                'id' => 'lease_' . $lease['id'],
                'title' => 'Lease Start - ' . $lease['boarder_name'],
                'date' => date('Y-m-d', strtotime($lease['event_date'])),
                'type' => 'lease',
                'color' => 'blue',
                'description' => 'Lease agreement begins for ' . $lease['property_name'] . ' - ' . $lease['room_name'],
                'tenant' => $lease['boarder_name'],
                'property' => $lease['property_name'] . ' - ' . $lease['room_name'],
                'action' => 'Application accepted'
            ];
        }
        
        // 3. Get Maintenance Events (scheduled maintenance)
        $stmt = $pdo->prepare("
            SELECT 
                m.id,
                m.created_at as event_date,
                m.title,
                m.description,
                m.priority,
                m.status,
                m.completed_at,
                r.title as room_name,
                pr.title as property_name,
                CONCAT(u.first_name, ' ', u.last_name) as boarder_name
            FROM maintenance_requests m
            INNER JOIN rooms r ON m.room_id = r.id
            INNER JOIN properties pr ON r.property_id = pr.id
            LEFT JOIN users u ON m.boarder_id = u.id
            WHERE m.landlord_id = :landlord_id
            AND DATE(m.created_at) BETWEEN :start_date AND :end_date
            AND m.deleted_at IS NULL
            ORDER BY m.created_at ASC
        ");
        $stmt->execute([
            'landlord_id' => $landlordId,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        $maintenance = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($maintenance as $maint) {
            $color = 'orange';
            if ($maint['priority'] === 'urgent') {
                $color = 'red';
            } elseif ($maint['status'] === 'completed') {
                $color = 'green';
            }
            
            $events[] = [
                'id' => 'maintenance_' . $maint['id'],
                'title' => 'Maintenance - ' . $maint['room_name'],
                'date' => date('Y-m-d', strtotime($maint['event_date'])),
                'type' => 'maintenance',
                'color' => $color,
                'description' => $maint['title'] . ': ' . $maint['description'],
                'property' => $maint['property_name'] . ' - ' . $maint['room_name'],
                'priority' => $maint['priority'],
                'status' => $maint['status'],
                'tenant' => $maint['boarder_name'],
                'time' => date('g:i A', strtotime($maint['event_date']))
            ];
        }
        
        // Sort all events by date
        usort($events, function($a, $b) {
            return strtotime($a['date']) - strtotime($b['date']);
        });
        
        echo json_encode([
            'success' => true,
            'events' => $events,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        
    } catch (PDOException $e) {
        error_log('Calendar events error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch calendar events'
        ]);
    }
}
