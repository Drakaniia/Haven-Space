<?php

/**
 * Landlord Payment Overview API
 * GET /api/landlord/payment-overview.php
 *
 * Returns payment status overview for the logged-in landlord:
 * - On track payments (paid or due in future)
 * - Due soon payments (within 7-14 days)
 * - Overdue payments (past due date)
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

    $today = date('Y-m-d');
    $dueSoonStart = date('Y-m-d', strtotime('+7 days'));
    $dueSoonEnd = date('Y-m-d', strtotime('+14 days'));

    // 1. Get On Track Payments (paid or due in future, not overdue)
    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.amount,
            p.late_fee,
            (p.amount + p.late_fee) as total_amount,
            p.due_date,
            p.status,
            p.paid_date,
            p.payment_method,
            p.reference_number,
            u.first_name,
            u.last_name,
            CONCAT(u.first_name, ' ', u.last_name) as full_name,
            r.title as room_title,
            pr.title as property_title
        FROM payments p
        INNER JOIN users u ON p.boarder_id = u.id
        INNER JOIN rooms r ON p.room_id = r.id
        INNER JOIN properties pr ON p.property_id = pr.id
        WHERE p.landlord_id = ?
            AND p.status IN ('pending', 'paid')
            AND (p.due_date > ? OR p.status = 'paid')
        ORDER BY p.due_date ASC
        LIMIT 10
    ");
    $stmt->execute([$landlordId, $today]);
    $onTrackPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Get Due Soon Payments (7-14 days from now)
    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.amount,
            p.late_fee,
            (p.amount + p.late_fee) as total_amount,
            p.due_date,
            p.status,
            p.paid_date,
            p.payment_method,
            p.reference_number,
            u.first_name,
            u.last_name,
            CONCAT(u.first_name, ' ', u.last_name) as full_name,
            r.title as room_title,
            pr.title as property_title,
            DATEDIFF(p.due_date, ?) as days_until_due
        FROM payments p
        INNER JOIN users u ON p.boarder_id = u.id
        INNER JOIN rooms r ON p.room_id = r.id
        INNER JOIN properties pr ON p.property_id = pr.id
        WHERE p.landlord_id = ?
            AND p.status = 'pending'
            AND p.due_date BETWEEN ? AND ?
        ORDER BY p.due_date ASC
        LIMIT 10
    ");
    $stmt->execute([$today, $landlordId, $today, $dueSoonEnd]);
    $dueSoonPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Get Overdue Payments (past due date)
    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.amount,
            p.late_fee,
            (p.amount + p.late_fee) as total_amount,
            p.due_date,
            p.status,
            p.paid_date,
            p.payment_method,
            p.reference_number,
            p.reminder_sent_at,
            u.first_name,
            u.last_name,
            CONCAT(u.first_name, ' ', u.last_name) as full_name,
            r.title as room_title,
            pr.title as property_title,
            DATEDIFF(?, p.due_date) as days_overdue
        FROM payments p
        INNER JOIN users u ON p.boarder_id = u.id
        INNER JOIN rooms r ON p.room_id = r.id
        INNER JOIN properties pr ON p.property_id = pr.id
        WHERE p.landlord_id = ?
            AND p.status = 'overdue'
        ORDER BY p.due_date ASC
        LIMIT 10
    ");
    $stmt->execute([$today, $landlordId]);
    $overduePayments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Count totals (without LIMIT)
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM payments p
        INNER JOIN properties pr ON p.property_id = pr.id
        WHERE p.landlord_id = ?
            AND p.status IN ('pending', 'paid')
            AND (p.due_date > ? OR p.status = 'paid')
    ");
    $stmt->execute([$landlordId, $today]);
    $onTrackCount = intval($stmt->fetch(PDO::FETCH_ASSOC)['count']);

    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM payments p
        WHERE p.landlord_id = ?
            AND p.status = 'pending'
            AND p.due_date BETWEEN ? AND ?
    ");
    $stmt->execute([$landlordId, $today, $dueSoonEnd]);
    $dueSoonCount = intval($stmt->fetch(PDO::FETCH_ASSOC)['count']);

    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM payments p
        WHERE p.landlord_id = ?
            AND p.status = 'overdue'
    ");
    $stmt->execute([$landlordId]);
    $overdueCount = intval($stmt->fetch(PDO::FETCH_ASSOC)['count']);

    json_response(200, [
        'data' => [
            'on_track' => [
                'count' => $onTrackCount,
                'payments' => $onTrackPayments,
            ],
            'due_soon' => [
                'count' => $dueSoonCount,
                'payments' => $dueSoonPayments,
            ],
            'overdue' => [
                'count' => $overdueCount,
                'payments' => $overduePayments,
            ],
        ],
    ]);

} catch (Exception $e) {
    error_log('Landlord payment overview error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to load payment overview']);
}
