<?php

/**
 * Landlord Applications API
 * 
 * Handles application management for landlords:
 * - GET /api/landlord/applications - List all applications for landlord's properties
 * - PATCH /api/landlord/applications/{id}/status - Update application status
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;

// Include database configuration
require_once __DIR__ . '/../../config/database.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $request_uri = $_SERVER['REQUEST_URI'];
    
    // For GET requests, use basic authentication
    // For PATCH requests (write operations), use verified landlord authorization
    if ($method === 'PATCH') {
        $user = Middleware::authorizeVerifiedLandlord();
    } else {
        $user = Middleware::authorize(['landlord']);
    }
    
    $userId = $user['user_id'];
    
    // Parse the request URI to extract application ID for status updates
    $path_parts = explode('/', trim(parse_url($request_uri, PHP_URL_PATH), '/'));
    
    // Handle different endpoints
    if ($method === 'GET' && !isset($path_parts[4])) {
        // GET /api/landlord/applications - List applications
        
        $pdo = getDB();
        
        // Get applications for landlord's properties with detailed information
        $stmt = $pdo->prepare("
            SELECT 
                a.id,
                a.status,
                a.created_at,
                a.updated_at,
                u.first_name,
                u.last_name,
                u.email,
                u.phone_number as phone,
                r.title as room_title,
                r.price as room_price,
                r.id as room_id,
                p.title as property_title,
                p.id as property_id
            FROM applications a
            INNER JOIN users u ON a.boarder_id = u.id
            INNER JOIN rooms r ON a.room_id = r.id
            INNER JOIN properties p ON r.property_id = p.id
            WHERE p.landlord_id = ?
                AND a.deleted_at IS NULL
            ORDER BY a.created_at DESC
        ");
        
        $stmt->execute([$userId]);
        $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        json_response(200, [
            'success' => true,
            'data' => $applications,
            'message' => 'Applications retrieved successfully'
        ]);
        
    } elseif ($method === 'PATCH' && isset($path_parts[4]) && $path_parts[5] === 'status') {
        // PATCH /api/landlord/applications/{id}/status - Update application status
        
        $application_id = intval($path_parts[4]);
        
        if (!$application_id) {
            json_response(400, [
                'success' => false,
                'error' => 'Invalid application ID'
            ]);
        }
        
        // Get request body
        $input = json_decode(file_get_contents('php://input'), true);
        $new_status = $input['status'] ?? '';
        
        // Validate status - accept both 'approved' and 'accepted', 'rejected' and 'declined'
        $valid_statuses = ['pending', 'under_review', 'approved', 'accepted', 'rejected', 'declined'];
        if (!in_array($new_status, $valid_statuses)) {
            json_response(400, [
                'success' => false,
                'error' => 'Invalid status. Must be one of: ' . implode(', ', $valid_statuses)
            ]);
        }
        
        // Normalize status names
        if ($new_status === 'approved') {
            $new_status = 'accepted';
        } elseif ($new_status === 'declined') {
            $new_status = 'rejected';
        }
        
        $pdo = getDB();
        
        // First, verify the application belongs to this landlord's property
        $verify_stmt = $pdo->prepare("
            SELECT a.id, a.status, a.boarder_id, r.id as room_id, p.landlord_id
            FROM applications a
            INNER JOIN rooms r ON a.room_id = r.id
            INNER JOIN properties p ON r.property_id = p.id
            WHERE a.id = ? AND p.landlord_id = ? AND a.deleted_at IS NULL
        ");
        
        $verify_stmt->execute([$application_id, $userId]);
        $application = $verify_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$application) {
            json_response(404, [
                'success' => false,
                'error' => 'Application not found or access denied'
            ]);
        }
        
        // Update the application status
        $update_stmt = $pdo->prepare("
            UPDATE applications 
            SET status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ");
        
        $success = $update_stmt->execute([$new_status, $application_id]);
        
        if (!$success) {
            json_response(500, [
                'success' => false,
                'error' => 'Failed to update application status'
            ]);
        }
        
        // If accepted, we might want to mark the room as occupied
        // and reject other pending applications for the same room
        if ($new_status === 'accepted') {
            // Update room status to occupied
            $room_stmt = $pdo->prepare("
                UPDATE rooms 
                SET status = 'occupied', updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            ");
            $room_stmt->execute([$application['room_id']]);
            
            // Reject other pending applications for the same room
            $reject_stmt = $pdo->prepare("
                UPDATE applications 
                SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
                WHERE room_id = ? AND id != ? AND status = 'pending'
            ");
            $reject_stmt->execute([$application['room_id'], $application_id]);
        }
        
        // If rejected and this was the only accepted application, mark room as available
        if ($new_status === 'rejected' && in_array($application['status'], ['accepted', 'approved'])) {
            // Check if there are other accepted applications for this room
            $check_stmt = $pdo->prepare("
                SELECT COUNT(*) as count 
                FROM applications 
                WHERE room_id = ? AND status IN ('accepted', 'approved') AND deleted_at IS NULL
            ");
            $check_stmt->execute([$application['room_id']]);
            $approved_count = $check_stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            if ($approved_count == 0) {
                // No other accepted applications, mark room as available
                $room_stmt = $pdo->prepare("
                    UPDATE rooms 
                    SET status = 'available', updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                ");
                $room_stmt->execute([$application['room_id']]);
            }
        }
        
        json_response(200, [
            'success' => true,
            'data' => [
                'application_id' => $application_id,
                'new_status' => $new_status,
                'updated_at' => date('c')
            ],
            'message' => 'Application status updated successfully'
        ]);
        
    } else {
        json_response(405, [
            'success' => false,
            'error' => 'Method not allowed'
        ]);
    }
    
} catch (PDOException $e) {
    error_log("Database error in landlord applications: " . $e->getMessage());
    json_response(500, [
        'success' => false,
        'error' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log("Error in landlord applications: " . $e->getMessage());
    json_response(500, [
        'success' => false,
        'error' => 'An error occurred: ' . $e->getMessage()
    ]);
}