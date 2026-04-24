<?php
/**
 * Landlord Announcements API
 * GET /api/landlord/announcements - Get all announcements for landlord
 * POST /api/landlord/announcements - Create new announcement
 * PUT /api/landlord/announcements/{id} - Update announcement
 * DELETE /api/landlord/announcements/{id} - Delete announcement
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Authenticate user and authorize as landlord
$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

$method = $_SERVER['REQUEST_METHOD'];

// GET - List all announcements
if ($method === 'GET') {
    try {
        $pdo = Connection::getInstance()->getPdo();

        $stmt = $pdo->prepare("
            SELECT 
                a.id,
                a.title,
                a.description,
                a.category,
                a.priority,
                a.publish_date,
                a.view_count,
                a.created_at,
                a.updated_at,
                CASE 
                    WHEN a.property_id IS NULL THEN 'All Properties'
                    ELSE p.title
                END as target_property,
                a.property_id
            FROM announcements a
            LEFT JOIN properties p ON a.property_id = p.id
            WHERE a.landlord_id = ? AND a.deleted_at IS NULL
            ORDER BY a.publish_date DESC, a.created_at DESC
        ");
        $stmt->execute([$landlordId]);
        $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get property IDs for announcements that target multiple properties
        $announcementIds = array_column($announcements, 'id');
        $multiPropertyMap = [];
        
        if (!empty($announcementIds)) {
            $placeholders = implode(',', array_fill(0, count($announcementIds), '?'));
            $propStmt = $pdo->prepare("
                SELECT ap.announcement_id, p.id, p.title
                FROM announcement_properties ap
                JOIN properties p ON ap.property_id = p.id
                WHERE ap.announcement_id IN ($placeholders)
            ");
            $propStmt->execute($announcementIds);
            $propRows = $propStmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($propRows as $row) {
                if (!isset($multiPropertyMap[$row['announcement_id']])) {
                    $multiPropertyMap[$row['announcement_id']] = [];
                }
                $multiPropertyMap[$row['announcement_id']][] = [
                    'id' => intval($row['id']),
                    'title' => $row['title']
                ];
            }
        }

        // Transform data
        $transformedAnnouncements = array_map(function($announcement) use ($multiPropertyMap) {
            $id = intval($announcement['id']);
            $targetProperties = [];
            
            if (isset($multiPropertyMap[$id]) && !empty($multiPropertyMap[$id])) {
                $targetProperties = $multiPropertyMap[$id];
            } elseif ($announcement['property_id']) {
                $targetProperties = [[
                    'id' => intval($announcement['property_id']),
                    'title' => $announcement['target_property']
                ]];
            }

            return [
                'id' => $id,
                'title' => htmlspecialchars($announcement['title']),
                'description' => htmlspecialchars($announcement['description']),
                'category' => $announcement['category'],
                'priority' => $announcement['priority'],
                'publish_date' => $announcement['publish_date'],
                'view_count' => intval($announcement['view_count']),
                'target_property' => $announcement['target_property'],
                'target_properties' => $targetProperties,
                'created_at' => $announcement['created_at'],
                'updated_at' => $announcement['updated_at']
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
        error_log('Get announcements error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to load announcements']);
    }
}

// POST - Create new announcement
if ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);

        // Validate required fields
        if (!isset($input['title']) || !isset($input['description'])) {
            json_response(400, ['error' => 'Missing required fields: title, description']);
        }

        $pdo = Connection::getInstance()->getPdo();
        $pdo->beginTransaction();

        // Determine property targeting
        $propertyId = null;
        $targetProperties = $input['properties'] ?? ['all'];
        
        // If not targeting all properties, we'll use the junction table
        $targetingAll = in_array('all', $targetProperties);

        // Insert announcement
        $stmt = $pdo->prepare("
            INSERT INTO announcements 
            (landlord_id, property_id, title, description, category, priority, publish_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        $publishDate = $input['publish_date'] ?? date('Y-m-d');
        $category = $input['category'] ?? 'general';
        $priority = $input['priority'] ?? 'medium';

        $stmt->execute([
            $landlordId,
            $propertyId, // NULL for all or multi-property
            $input['title'],
            $input['description'],
            $category,
            $priority,
            $publishDate
        ]);

        $announcementId = $pdo->lastInsertId();

        // If targeting specific properties (not all), insert into junction table
        if (!$targetingAll && !empty($targetProperties)) {
            $propStmt = $pdo->prepare("
                INSERT INTO announcement_properties (announcement_id, property_id)
                VALUES (?, ?)
            ");
            
            foreach ($targetProperties as $propId) {
                if (is_numeric($propId)) {
                    $propStmt->execute([$announcementId, $propId]);
                }
            }
        }

        // Create notifications for all boarders in affected properties
        createAnnouncementNotifications($pdo, $announcementId, $landlordId, $targetProperties, $input['title']);

        $pdo->commit();

        json_response(201, [
            'success' => true,
            'data' => [
                'announcement_id' => $announcementId,
                'message' => 'Announcement created successfully'
            ]
        ]);

    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Create announcement error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to create announcement']);
    }
}

// PUT - Update announcement
if ($method === 'PUT') {
    try {
        // Get announcement ID from URL
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        preg_match('/\/announcements\/(\d+)/', $uri, $matches);
        $announcementId = $matches[1] ?? null;

        if (!$announcementId) {
            json_response(400, ['error' => 'Announcement ID is required']);
        }

        $input = json_decode(file_get_contents('php://input'), true);

        // Validate required fields
        if (!isset($input['title']) || !isset($input['description'])) {
            json_response(400, ['error' => 'Missing required fields: title, description']);
        }

        $pdo = Connection::getInstance()->getPdo();
        $pdo->beginTransaction();

        // Verify ownership
        $checkStmt = $pdo->prepare("
            SELECT id FROM announcements 
            WHERE id = ? AND landlord_id = ? AND deleted_at IS NULL
        ");
        $checkStmt->execute([$announcementId, $landlordId]);
        if (!$checkStmt->fetch()) {
            json_response(404, ['error' => 'Announcement not found']);
        }

        // Update announcement
        $stmt = $pdo->prepare("
            UPDATE announcements 
            SET title = ?, description = ?, category = ?, priority = ?, publish_date = ?
            WHERE id = ? AND landlord_id = ?
        ");

        $publishDate = $input['publish_date'] ?? date('Y-m-d');
        $category = $input['category'] ?? 'general';
        $priority = $input['priority'] ?? 'medium';

        $stmt->execute([
            $input['title'],
            $input['description'],
            $category,
            $priority,
            $publishDate,
            $announcementId,
            $landlordId
        ]);

        // Update property targeting if provided
        if (isset($input['properties'])) {
            // Delete existing property associations
            $deleteStmt = $pdo->prepare("
                DELETE FROM announcement_properties WHERE announcement_id = ?
            ");
            $deleteStmt->execute([$announcementId]);

            // Insert new associations if not targeting all
            $targetProperties = $input['properties'];
            $targetingAll = in_array('all', $targetProperties);

            if (!$targetingAll && !empty($targetProperties)) {
                $propStmt = $pdo->prepare("
                    INSERT INTO announcement_properties (announcement_id, property_id)
                    VALUES (?, ?)
                ");
                
                foreach ($targetProperties as $propId) {
                    if (is_numeric($propId)) {
                        $propStmt->execute([$announcementId, $propId]);
                    }
                }
            }
        }

        $pdo->commit();

        json_response(200, [
            'success' => true,
            'data' => [
                'message' => 'Announcement updated successfully'
            ]
        ]);

    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Update announcement error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to update announcement']);
    }
}

// DELETE - Delete announcement
if ($method === 'DELETE') {
    try {
        // Get announcement ID from URL
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        preg_match('/\/announcements\/(\d+)/', $uri, $matches);
        $announcementId = $matches[1] ?? null;

        if (!$announcementId) {
            json_response(400, ['error' => 'Announcement ID is required']);
        }

        $pdo = Connection::getInstance()->getPdo();

        // Verify ownership and soft delete
        $stmt = $pdo->prepare("
            UPDATE announcements 
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = ? AND landlord_id = ? AND deleted_at IS NULL
        ");
        $stmt->execute([$announcementId, $landlordId]);

        if ($stmt->rowCount() === 0) {
            json_response(404, ['error' => 'Announcement not found']);
        }

        json_response(200, [
            'success' => true,
            'data' => [
                'message' => 'Announcement deleted successfully'
            ]
        ]);

    } catch (Exception $e) {
        error_log('Delete announcement error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to delete announcement']);
    }
}

/**
 * Create notifications for boarders about new announcement
 */
function createAnnouncementNotifications($pdo, $announcementId, $landlordId, $targetProperties, $title) {
    try {
        // Get all boarders who have applications in the targeted properties
        $targetingAll = in_array('all', $targetProperties);
        
        if ($targetingAll) {
            // Get all boarders with accepted applications for this landlord's properties
            $stmt = $pdo->prepare("
                SELECT DISTINCT a.boarder_id
                FROM applications a
                JOIN properties p ON a.property_id = p.id
                WHERE p.landlord_id = ? AND a.status = 'accepted' AND a.deleted_at IS NULL
            ");
            $stmt->execute([$landlordId]);
        } else {
            // Get boarders with accepted applications for specific properties
            $placeholders = implode(',', array_fill(0, count($targetProperties), '?'));
            $stmt = $pdo->prepare("
                SELECT DISTINCT boarder_id
                FROM applications
                WHERE property_id IN ($placeholders) AND status = 'accepted' AND deleted_at IS NULL
            ");
            $stmt->execute($targetProperties);
        }
        
        $boarders = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($boarders)) {
            return;
        }

        // Create notification for each boarder
        $notifStmt = $pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message, metadata)
            VALUES (?, 'announcement', ?, ?, ?)
        ");

        $metadata = json_encode([
            'announcement_id' => $announcementId,
            'landlord_id' => $landlordId
        ]);

        foreach ($boarders as $boarderId) {
            $notifStmt->execute([
                $boarderId,
                'New Announcement',
                $title,
                $metadata
            ]);
        }

    } catch (Exception $e) {
        error_log('Create announcement notifications error: ' . $e->getMessage());
        // Don't throw - notifications are not critical
    }
}

// Method not allowed
json_response(405, ['error' => 'Method not allowed']);
