<?php

/**
 * Landlord Applications API
 * 
 * Handles application management for landlords:
 * - GET /api/landlord/applications - List all applications for landlord's properties
 * - PATCH /api/landlord/applications/{id}/status - Update application status
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    function json_response($data, $status = 200, $message = 'Success') {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => $status < 400,
            'status' => $status,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('c')
        ]);
        exit;
    }
}

// Include database configuration
require_once __DIR__ . '/../../config/database.php';

try {
    // Simple authentication using X-User-ID header for development
    $simulatedId = $_SERVER['HTTP_X_USER_ID'] ?? $_GET['user_id'] ?? null;
    
    if (!$simulatedId) {
        json_response(null, 401, 'Authentication required');
    }
    
    $userId = (int) $simulatedId;
    
    // Get user info from database
    require_once __DIR__ . '/../config/database.php';
    $pdo = getDB();
    
    $userStmt = $pdo->prepare('
        SELECT u.id, ur.role_name as role, u.is_verified, u.email_verified, 
               acs.status_name as account_status, vr.verification_status_id,
               vs.status_name as verification_status
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        JOIN account_statuses acs ON u.account_status_id = acs.id
        LEFT JOIN verification_records vr ON vr.entity_type = "user" AND vr.entity_id = u.id
        LEFT JOIN verification_statuses vs ON vr.verification_status_id = vs.id
        WHERE u.id = ? AND u.deleted_at IS NULL
    ');
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        json_response(null, 401, 'User not found');
    }
    
    if ($user['role'] !== 'landlord') {
        json_response(null, 403, 'Access denied. Landlord role required.');
    }
    
    // Check if account is actually suspended or banned (not just pending verification)
    if (in_array($user['account_status'], ['suspended', 'banned'])) {
        json_response(null, 403, 'Account is suspended or banned');
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $request_uri = $_SERVER['REQUEST_URI'];
    
    // For write operations, check verification status
    if ($method === 'PATCH') {
        if ($user['account_status'] === 'pending_verification' || $user['verification_status'] === 'pending') {
            json_response(null, 403, 'Account verification pending. You have read-only access until verification is complete.');
        }
        
        if ($user['verification_status'] === 'rejected') {
            json_response(null, 403, 'Account verification rejected. Please review the feedback and resubmit required documents.');
        }
        
        if (!$user['is_verified'] && $user['verification_status'] !== 'approved') {
            json_response(null, 403, 'Account verification required. Write operations are not allowed until an admin approves your account.');
        }
    }
    
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
                u.phone,
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
        
        $stmt->execute([$user['id']]);
        $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        json_response($applications, 200, 'Applications retrieved successfully');
        
    } elseif ($method === 'PATCH' && isset($path_parts[4]) && $path_parts[5] === 'status') {
        // PATCH /api/landlord/applications/{id}/status - Update application status
        
        $application_id = intval($path_parts[4]);
        
        if (!$application_id) {
            json_response(null, 400, 'Invalid application ID');
        }
        
        // Get request body
        $input = json_decode(file_get_contents('php://input'), true);
        $new_status = $input['status'] ?? '';
        
        // Validate status
        $valid_statuses = ['pending', 'under_review', 'approved', 'rejected'];
        if (!in_array($new_status, $valid_statuses)) {
            json_response(null, 400, 'Invalid status. Must be one of: ' . implode(', ', $valid_statuses));
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
        
        $verify_stmt->execute([$application_id, $user['id']]);
        $application = $verify_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$application) {
            json_response(null, 404, 'Application not found or access denied');
        }
        
        // Update the application status
        $update_stmt = $pdo->prepare("
            UPDATE applications 
            SET status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ");
        
        $success = $update_stmt->execute([$new_status, $application_id]);
        
        if (!$success) {
            json_response(null, 500, 'Failed to update application status');
        }
        
        // If approved, we might want to mark the room as occupied
        // and reject other pending applications for the same room
        if ($new_status === 'approved') {
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
        
        // If rejected and this was the only approved application, mark room as available
        if ($new_status === 'rejected' && $application['status'] === 'approved') {
            // Check if there are other approved applications for this room
            $check_stmt = $pdo->prepare("
                SELECT COUNT(*) as count 
                FROM applications 
                WHERE room_id = ? AND status = 'approved' AND deleted_at IS NULL
            ");
            $check_stmt->execute([$application['room_id']]);
            $approved_count = $check_stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            if ($approved_count == 0) {
                // No other approved applications, mark room as available
                $room_stmt = $pdo->prepare("
                    UPDATE rooms 
                    SET status = 'available', updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                ");
                $room_stmt->execute([$application['room_id']]);
            }
        }
        
        json_response([
            'application_id' => $application_id,
            'new_status' => $new_status,
            'updated_at' => date('c')
        ], 200, 'Application status updated successfully');
        
    } else {
        json_response(null, 405, 'Method not allowed');
    }
    
} catch (PDOException $e) {
    error_log("Database error in landlord applications: " . $e->getMessage());
    json_response(null, 500, 'Database error occurred');
} catch (Exception $e) {
    error_log("Error in landlord applications: " . $e->getMessage());
    json_response(null, 500, 'An error occurred: ' . $e->getMessage());
}