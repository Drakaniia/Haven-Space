<?php
/**
 * Boarder Announcements API
 * GET /api/boarder/announcements - Get all announcements for boarder's properties
 * POST /api/boarder/announcements/{id}/view - Mark announcement as viewed
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

$method = $_SERVER['REQUEST_METHOD'];

// GET - List all announcements for boarder
if ($method === 'GET') {
    try {
        $pdo = Connection::getInstance()->getPdo();

        // Get properties where boarder has accepted applications
        $propStmt = $pdo->prepare("
            SELECT DISTINCT property_id
            FROM applications
            WHERE boarder_id = ? AND status = 'accepted' AND deleted_at IS NULL
        ");
        $propStmt->execute([$boarderId]);
        $propertyIds = $propStmt->fetchAll(PDO::FETCH_COLUMN);

        // Get landlords who own the properties where boarder has accepted applications
        $landlordStmt = $pdo->prepare("
            SELECT DISTINCT p.landlord_id
            FROM applications a
            JOIN properties p ON a.property_id = p.id
            WHERE a.boarder_id = ? AND a.status = 'accepted' AND a.deleted_at IS NULL
        ");
        $landlordStmt->execute([$boarderId]);
        $landlordIds = $landlordStmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($landlordIds)) {
            json_response(200, [
                'success' => true,
                'data' => [
                    'announcements' => [],
                    'total_count' => 0
                ]
            ]);
            return;
        }

        $landlordPlaceholders = implode(',', array_fill(0, count($landlordIds), '?'));
        $placeholders = implode(',', array_fill(0, count($propertyIds), '?'));

        // Get announcements for these properties or all properties from the boarder's landlords
        $stmt = $pdo->prepare("
            SELECT DISTINCT
                a.id,
                a.title,
                a.description,
                a.category,
                a.priority,
                a.publish_date,
                a.view_count,
                a.created_at,
                CASE 
                    WHEN a.property_id IS NULL THEN 'All Properties'
                    ELSE p.title
                END as target_property,
                u.first_name,
                u.last_name,
                av.viewed_at
            FROM announcements a
            LEFT JOIN properties p ON a.property_id = p.id
            LEFT JOIN users u ON a.landlord_id = u.id
            LEFT JOIN announcement_views av ON a.id = av.announcement_id AND av.user_id = ?
            WHERE a.deleted_at IS NULL
            AND a.landlord_id IN ($landlordPlaceholders)
            AND (
                a.property_id IS NULL
                OR a.property_id IN ($placeholders)
                OR EXISTS (
                    SELECT 1 FROM announcement_properties ap
                    WHERE ap.announcement_id = a.id
                    AND ap.property_id IN ($placeholders)
                )
            )
            AND a.publish_date <= CURDATE()
            ORDER BY a.publish_date DESC, a.created_at DESC
        ");
        
        $params = array_merge([$boarderId], $landlordIds, $propertyIds, $propertyIds);
        $stmt->execute($params);
        $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Transform data
        $transformedAnnouncements = array_map(function($announcement) {
            return [
                'id' => intval($announcement['id']),
                'title' => htmlspecialchars($announcement['title']),
                'description' => htmlspecialchars($announcement['description']),
                'category' => $announcement['category'],
                'priority' => $announcement['priority'],
                'publish_date' => $announcement['publish_date'],
                'view_count' => intval($announcement['view_count']),
                'target_property' => $announcement['target_property'],
                'landlord_name' => htmlspecialchars($announcement['first_name'] . ' ' . $announcement['last_name']),
                'is_viewed' => $announcement['viewed_at'] !== null,
                'viewed_at' => $announcement['viewed_at'],
                'created_at' => $announcement['created_at']
            ];
        }, $announcements);

        json_response(200, [
            'success' => true,
            'data' => [
                'announcements' => $transformedAnnouncements,
                'total_count' => count($transformedAnnouncements)
            ]
        ]);

    } catch (Exception $e) {
        error_log('Get boarder announcements error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to load announcements']);
    }
}

// POST - Mark announcement as viewed
if ($method === 'POST') {
    try {
        // Get announcement ID from URL
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        preg_match('/\/announcements\/(\d+)\/view/', $uri, $matches);
        $announcementId = $matches[1] ?? null;

        if (!$announcementId) {
            json_response(400, ['error' => 'Announcement ID is required']);
        }

        $pdo = Connection::getInstance()->getPdo();
        $pdo->beginTransaction();

        // Insert view record (ignore if already exists)
        $stmt = $pdo->prepare("
            INSERT IGNORE INTO announcement_views (announcement_id, user_id)
            VALUES (?, ?)
        ");
        $stmt->execute([$announcementId, $boarderId]);

        // Update view count
        $updateStmt = $pdo->prepare("
            UPDATE announcements 
            SET view_count = (
                SELECT COUNT(*) FROM announcement_views WHERE announcement_id = ?
            )
            WHERE id = ?
        ");
        $updateStmt->execute([$announcementId, $announcementId]);

        $pdo->commit();

        json_response(200, [
            'success' => true,
            'data' => [
                'message' => 'Announcement marked as viewed'
            ]
        ]);

    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Mark announcement viewed error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to mark announcement as viewed']);
    }
}

// Method not allowed
json_response(405, ['error' => 'Method not allowed']);
