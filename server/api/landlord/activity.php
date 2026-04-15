<?php

/**
 * Landlord Recent Activity API
 * GET /api/landlord/activity.php
 *
 * Returns recent activities for the logged-in landlord:
 * - Payment received
 * - New applications
 * - Payment reminders sent
 * - Maintenance requests
 * - Lease renewals
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
    $activities = [];
    $limit = 10;

    // 1. Get recent payments (paid)
    $stmt = $pdo->prepare("
        SELECT 
            'payment_received' as type,
            p.id,
            p.paid_date as activity_date,
            CONCAT(u.first_name, ' ', u.last_name) as entity_name,
            pr.title as property_name,
            NULL as room_name,
            p.amount
        FROM payments p
        INNER JOIN users u ON p.boarder_id = u.id
        INNER JOIN properties pr ON p.property_id = pr.id
        WHERE p.landlord_id = ? 
            AND p.status = 'paid'
            AND p.paid_date IS NOT NULL
        ORDER BY p.paid_date DESC
        LIMIT 5
    ");
    $stmt->execute([$landlordId]);
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $activities = array_merge($activities, $payments);

    // 2. Get recent applications (new submissions)
    $stmt = $pdo->prepare("
        SELECT 
            'new_application' as type,
            a.id,
            a.created_at as activity_date,
            CONCAT(u.first_name, ' ', u.last_name) as entity_name,
            pr.title as property_name,
            r.title as room_name,
            NULL as amount
        FROM applications a
        INNER JOIN users u ON a.boarder_id = u.id
        INNER JOIN properties pr ON a.property_id = pr.id
        INNER JOIN rooms r ON a.room_id = r.id
        WHERE a.landlord_id = ? 
            AND a.status = 'pending'
        ORDER BY a.created_at DESC
        LIMIT 5
    ");
    $stmt->execute([$landlordId]);
    $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $activities = array_merge($activities, $applications);

    // 3. Get payment reminders sent
    $stmt = $pdo->prepare("
        SELECT 
            'payment_reminder' as type,
            p.id,
            p.reminder_sent_at as activity_date,
            CONCAT(u.first_name, ' ', u.last_name) as entity_name,
            pr.title as property_name,
            NULL as room_name,
            p.amount
        FROM payments p
        INNER JOIN users u ON p.boarder_id = u.id
        INNER JOIN properties pr ON p.property_id = pr.id
        WHERE p.landlord_id = ? 
            AND p.reminder_sent_at IS NOT NULL
        ORDER BY p.reminder_sent_at DESC
        LIMIT 3
    ");
    $stmt->execute([$landlordId]);
    $reminders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $activities = array_merge($activities, $reminders);

    // 4. Get recent maintenance requests
    $stmt = $pdo->prepare("
        SELECT 
            'maintenance_request' as type,
            m.id,
            m.created_at as activity_date,
            r.title as entity_name,
            pr.title as property_name,
            r.title as room_name,
            NULL as amount
        FROM maintenance_requests m
        INNER JOIN rooms r ON m.room_id = r.id
        INNER JOIN properties pr ON r.property_id = pr.id
        WHERE pr.landlord_id = ?
        ORDER BY m.created_at DESC
        LIMIT 5
    ");
    $stmt->execute([$landlordId]);
    $maintenance = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $activities = array_merge($activities, $maintenance);

    // 5. Get recent lease renewals (approved applications with recent status update)
    $stmt = $pdo->prepare("
        SELECT 
            'lease_renewal' as type,
            a.id,
            a.updated_at as activity_date,
            CONCAT(u.first_name, ' ', u.last_name) as entity_name,
            pr.title as property_name,
            r.title as room_name,
            NULL as amount
        FROM applications a
        INNER JOIN users u ON a.boarder_id = u.id
        INNER JOIN properties pr ON a.property_id = pr.id
        INNER JOIN rooms r ON a.room_id = r.id
        WHERE a.landlord_id = ? 
            AND a.status = 'approved'
            AND a.updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY a.updated_at DESC
        LIMIT 3
    ");
    $stmt->execute([$landlordId]);
    $renewals = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $activities = array_merge($activities, $renewals);

    // Sort all activities by date (newest first)
    usort($activities, function($a, $b) {
        return strtotime($b['activity_date']) - strtotime($a['activity_date']);
    });

    // Limit total results
    $activities = array_slice($activities, 0, $limit);

    // Format activities for display
    $formattedActivities = array_map(function($activity) {
        return formatActivity($activity);
    }, $activities);

    json_response(200, [
        'data' => [
            'activities' => $formattedActivities,
            'total' => count($formattedActivities),
        ],
    ]);

} catch (Exception $e) {
    error_log('Landlord activity error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to load recent activities']);
}

/**
 * Format activity for display
 * @param array $activity - Raw activity data
 * @return array Formatted activity
 */
function formatActivity($activity) {
    $type = $activity['type'];
    $entityName = $activity['entity_name'] ?? '';
    $propertyName = $activity['property_name'] ?? '';
    $roomName = $activity['room_name'] ?? '';
    $activityDate = $activity['activity_date'];
    
    $icon = 'clock';
    $color = 'gray';
    $description = '';
    $timeAgo = getTimeAgo($activityDate);

    switch ($type) {
        case 'payment_received':
            $icon = 'currencyDollar';
            $color = 'green';
            $description = "<strong>{$entityName}</strong> paid rent for <strong>{$propertyName}</strong>";
            break;
            
        case 'new_application':
            $icon = 'user';
            $color = 'blue';
            $description = "<strong>New application</strong> from {$entityName}" . ($roomName ? " for {$roomName}" : "");
            break;
            
        case 'payment_reminder':
            $icon = 'exclamation';
            $color = 'yellow';
            $description = "<strong>Payment reminder</strong> sent to {$entityName}";
            break;
            
        case 'maintenance_request':
            $icon = 'wrenchScrewdriver';
            $color = 'orange';
            $description = "<strong>Maintenance request</strong> from {$roomName}";
            break;
            
        case 'lease_renewal':
            $icon = 'checkCircle';
            $color = 'purple';
            $description = "<strong>Lease renewed</strong> for {$propertyName}" . ($roomName ? " - {$roomName}" : "");
            break;
            
        default:
            $description = $entityName;
    }

    return [
        'id' => $activity['id'],
        'type' => $type,
        'icon' => $icon,
        'color' => $color,
        'description' => $description,
        'time_ago' => $timeAgo,
        'date' => $activityDate,
    ];
}

/**
 * Get human-readable time ago string
 * @param string $date - Date string
 * @return string Time ago string
 */
function getTimeAgo($date) {
    $timestamp = strtotime($date);
    $diff = time() - $timestamp;

    if ($diff < 60) {
        return 'Just now';
    } elseif ($diff < 3600) {
        $minutes = floor($diff / 60);
        return $minutes . ' minute' . ($minutes > 1 ? 's' : '') . ' ago';
    } elseif ($diff < 86400) {
        $hours = floor($diff / 3600);
        return $hours . ' hour' . ($hours > 1 ? 's' : '') . ' ago';
    } elseif ($diff < 172800) {
        return '1 day ago';
    } elseif ($diff < 604800) {
        $days = floor($diff / 86400);
        return $days . ' days ago';
    } else {
        $weeks = floor($diff / 604800);
        return $weeks . ' week' . ($weeks > 1 ? 's' : '') . ' ago';
    }
}