<?php

/**
 * User Profile API Endpoints
 * Handles user profile data updates
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

use App\Core\Database;
use App\Api\Middleware;

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authenticate user
$user = Middleware::authenticate();
if (!$user) {
    json_response(401, ['error' => 'Unauthorized']);
    return;
}

$method = $_SERVER['REQUEST_METHOD'];
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        getUserProfile($db, $user['id']);
        break;
    case 'PUT':
    case 'PATCH':
        updateUserProfile($db, $user['id']);
        break;
    default:
        json_response(405, ['error' => 'Method not allowed']);
}

/**
 * Get user profile data
 */
function getUserProfile($db, $userId) {
    try {
        $stmt = $db->prepare("
            SELECT 
                u.id, u.first_name, u.last_name, u.email, u.phone, u.alt_phone,
                u.date_of_birth, u.gender, u.bio, u.current_address, u.avatar_url,
                u.employment_status, u.company_name, u.job_title, u.monthly_income,
                u.work_schedule, u.company_address,
                u.emergency_contact_name, u.emergency_contact_relationship,
                u.emergency_contact_phone, u.emergency_contact_alt_phone,
                u.emergency_contact_address,
                u.created_at, u.updated_at,
                f.file_url as avatar_file_url
            FROM users u
            LEFT JOIN files f ON u.avatar_file_id = f.id
            WHERE u.id = ? AND u.deleted_at IS NULL
        ");
        
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            json_response(404, ['error' => 'User not found']);
            return;
        }
        
        // Use avatar_file_url if available, otherwise use avatar_url
        if ($user['avatar_file_url']) {
            $user['avatar_url'] = $user['avatar_file_url'];
        }
        
        // Remove the temporary field
        unset($user['avatar_file_url']);
        
        json_response(200, ['user' => $user]);
        
    } catch (Exception $e) {
        error_log("Error fetching user profile: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to fetch profile']);
    }
}

/**
 * Update user profile data
 */
function updateUserProfile($db, $userId) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            json_response(400, ['error' => 'Invalid JSON data']);
            return;
        }
        
        // Define allowed fields for update
        $allowedFields = [
            'first_name', 'last_name', 'phone', 'alt_phone',
            'date_of_birth', 'gender', 'bio', 'current_address',
            'employment_status', 'company_name', 'job_title', 
            'monthly_income', 'work_schedule', 'company_address',
            'emergency_contact_name', 'emergency_contact_relationship',
            'emergency_contact_phone', 'emergency_contact_alt_phone',
            'emergency_contact_address'
        ];
        
        // Build dynamic update query
        $updateFields = [];
        $values = [];
        
        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $input)) {
                $updateFields[] = "$field = ?";
                $values[] = $input[$field];
            }
        }
        
        if (empty($updateFields)) {
            json_response(400, ['error' => 'No valid fields to update']);
            return;
        }
        
        // Add updated_at and user ID
        $updateFields[] = "updated_at = NOW()";
        $values[] = $userId;
        
        $sql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = ? AND deleted_at IS NULL";
        
        $stmt = $db->prepare($sql);
        $result = $stmt->execute($values);
        
        if (!$result) {
            json_response(500, ['error' => 'Failed to update profile']);
            return;
        }
        
        // Fetch updated user data with avatar
        $stmt = $db->prepare("
            SELECT 
                u.id, u.first_name, u.last_name, u.email, u.phone, u.alt_phone,
                u.date_of_birth, u.gender, u.bio, u.current_address, u.avatar_url,
                u.employment_status, u.company_name, u.job_title, u.monthly_income,
                u.work_schedule, u.company_address,
                u.emergency_contact_name, u.emergency_contact_relationship,
                u.emergency_contact_phone, u.emergency_contact_alt_phone,
                u.emergency_contact_address,
                u.created_at, u.updated_at,
                f.file_url as avatar_file_url
            FROM users u
            LEFT JOIN files f ON u.avatar_file_id = f.id
            WHERE u.id = ? AND u.deleted_at IS NULL
        ");
        
        $stmt->execute([$userId]);
        $updatedUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Use avatar_file_url if available, otherwise use avatar_url
        if ($updatedUser['avatar_file_url']) {
            $updatedUser['avatar_url'] = $updatedUser['avatar_file_url'];
        }
        
        // Remove the temporary field
        unset($updatedUser['avatar_file_url']);
        
        json_response(200, [
            'message' => 'Profile updated successfully',
            'user' => $updatedUser
        ]);
        
    } catch (Exception $e) {
        error_log("Error updating user profile: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to update profile']);
    }
}