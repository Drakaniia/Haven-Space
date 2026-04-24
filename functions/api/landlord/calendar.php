<?php

/**
 * Landlord Calendar API
 * GET /api/landlord/calendar - Get calendar events (payments, leases, maintenance)
 *
 * Query params:
 *   start_date  YYYY-MM-DD  (default: first day of current month)
 *   end_date    YYYY-MM-DD  (default: last day 3 months ahead)
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

$user       = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

try {
    $pdo = Connection::getInstance()->getPdo();

    $startDate = $_GET['start_date'] ?? date('Y-m-01');
    $endDate   = $_GET['end_date']   ?? date('Y-m-t', strtotime('+2 months'));

    $events = [];

    // ----------------------------------------------------------------
    // 1. Payment events (due dates)
    // ----------------------------------------------------------------
    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.due_date          AS event_date,
            p.amount,
            p.status,
            p.payment_method,
            p.paid_date,
            CONCAT(u.first_name, ' ', u.last_name) AS boarder_name,
            r.title             AS room_name,
            pr.title            AS property_name
        FROM payments p
        INNER JOIN users u  ON p.boarder_id  = u.id
        INNER JOIN rooms r  ON p.room_id     = r.id
        INNER JOIN properties pr ON p.property_id = pr.id
        WHERE p.landlord_id = :landlord_id
          AND p.due_date BETWEEN :start_date AND :end_date
          AND p.status IN ('pending', 'overdue', 'paid')
        ORDER BY p.due_date ASC
    ");
    $stmt->execute([
        'landlord_id' => $landlordId,
        'start_date'  => $startDate,
        'end_date'    => $endDate,
    ]);
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($payments as $payment) {
        if ($payment['status'] === 'overdue') {
            $color = 'red';
            $title = 'Overdue Payment - ' . $payment['boarder_name'];
        } elseif ($payment['status'] === 'paid') {
            $color = 'green';
            $title = 'Payment Received - ' . $payment['boarder_name'];
        } else {
            $color = 'green';
            $title = 'Rent Due - ' . $payment['boarder_name'];
        }

        $events[] = [
            'id'             => 'payment_' . $payment['id'],
            'title'          => $title,
            'date'           => $payment['event_date'],
            'type'           => 'payment',
            'color'          => $color,
            'description'    => 'Monthly rent payment of ₱' . number_format($payment['amount'], 2)
                                . ' for ' . $payment['property_name'] . ' - ' . $payment['room_name'],
            'tenant'         => $payment['boarder_name'],
            'property'       => $payment['property_name'] . ' - ' . $payment['room_name'],
            'amount'         => '₱' . number_format($payment['amount'], 2),
            'status'         => $payment['status'],
            'payment_method' => $payment['payment_method'],
            'paid_date'      => $payment['paid_date'],
        ];
    }

    // ----------------------------------------------------------------
    // 2. Lease events (accepted applications = lease start)
    // ----------------------------------------------------------------
    $stmt = $pdo->prepare("
        SELECT
            a.id,
            a.created_at        AS event_date,
            a.status,
            CONCAT(u.first_name, ' ', u.last_name) AS boarder_name,
            r.title             AS room_name,
            pr.title            AS property_name
        FROM applications a
        INNER JOIN users u  ON a.boarder_id  = u.id
        INNER JOIN rooms r  ON a.room_id     = r.id
        INNER JOIN properties pr ON r.property_id = pr.id
        WHERE a.landlord_id = :landlord_id
          AND a.status      = 'accepted'
          AND DATE(a.created_at) BETWEEN :start_date AND :end_date
          AND a.deleted_at IS NULL
        ORDER BY a.created_at ASC
    ");
    $stmt->execute([
        'landlord_id' => $landlordId,
        'start_date'  => $startDate,
        'end_date'    => $endDate,
    ]);
    $leases = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($leases as $lease) {
        $events[] = [
            'id'          => 'lease_' . $lease['id'],
            'title'       => 'Lease Start - ' . $lease['boarder_name'],
            'date'        => date('Y-m-d', strtotime($lease['event_date'])),
            'type'        => 'lease',
            'color'       => 'blue',
            'description' => 'Lease agreement begins for ' . $lease['property_name'] . ' - ' . $lease['room_name'],
            'tenant'      => $lease['boarder_name'],
            'property'    => $lease['property_name'] . ' - ' . $lease['room_name'],
            'action'      => 'Application accepted',
        ];
    }

    // ----------------------------------------------------------------
    // 3. Maintenance events
    // ----------------------------------------------------------------
    $stmt = $pdo->prepare("
        SELECT
            m.id,
            m.created_at        AS event_date,
            m.title,
            m.description,
            m.priority,
            m.status,
            m.completed_at,
            r.title             AS room_name,
            pr.title            AS property_name,
            CONCAT(u.first_name, ' ', u.last_name) AS boarder_name
        FROM maintenance_requests m
        INNER JOIN rooms r  ON m.room_id     = r.id
        INNER JOIN properties pr ON r.property_id = pr.id
        LEFT  JOIN users u  ON m.boarder_id  = u.id
        WHERE m.landlord_id = :landlord_id
          AND DATE(m.created_at) BETWEEN :start_date AND :end_date
          AND m.deleted_at IS NULL
        ORDER BY m.created_at ASC
    ");
    $stmt->execute([
        'landlord_id' => $landlordId,
        'start_date'  => $startDate,
        'end_date'    => $endDate,
    ]);
    $maintenance = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($maintenance as $maint) {
        if ($maint['priority'] === 'urgent') {
            $color = 'red';
        } elseif ($maint['status'] === 'completed') {
            $color = 'green';
        } else {
            $color = 'orange';
        }

        $events[] = [
            'id'          => 'maintenance_' . $maint['id'],
            'title'       => 'Maintenance - ' . $maint['room_name'],
            'date'        => date('Y-m-d', strtotime($maint['event_date'])),
            'type'        => 'maintenance',
            'color'       => $color,
            'description' => $maint['title'] . ': ' . $maint['description'],
            'property'    => $maint['property_name'] . ' - ' . $maint['room_name'],
            'priority'    => $maint['priority'],
            'status'      => $maint['status'],
            'tenant'      => $maint['boarder_name'],
            'time'        => date('g:i A', strtotime($maint['event_date'])),
        ];
    }

    // Sort all events by date
    usort($events, fn($a, $b) => strtotime($a['date']) - strtotime($b['date']));

    json_response(200, [
        'success'    => true,
        'events'     => $events,
        'start_date' => $startDate,
        'end_date'   => $endDate,
    ]);

} catch (Exception $e) {
    error_log('Calendar events error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to fetch calendar events']);
}
