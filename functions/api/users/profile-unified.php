<?php

/**
 * User Profile API Endpoints (Updated for Environment Switching)
 * Handles user profile data updates with automatic database switching
 * 
 * This is an example of how to update existing endpoints to use the unified database system
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';
require_once __DIR__ . '/../../config/database.php';

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

// Get unified database adapter (automatically switches based on APP_ENV)
$db = getUnifiedDB();

switch ($method) {
    case 'GET':
        getUserProfile($db, $user['user_id']);
        break;
    case 'PUT':
    case 'PATCH':
        updateUserProfile($db, $user['user_id']);
        break;
    default:
        json_response(405, ['error' => 'Method not allowed']);
}

/**
 * Get user profile data using unified database interface
 */
function getUserProfile($db, $userId) {
    try {
        // Using unified interface - works with both MySQL and Appwrite
        $users = $db->select('users', ['id' => $userId], [
            'fields' => ['id', 'name', 'email', 'phone_number', 'avatar_url', 'created_at', 'updated_at']
        ]);
        
        if (empty($users)) {
            json_response(404, ['error' => 'User not found']);
            return;
        }
        
        $user = $users[0];
        
        // Get additional profile data if needed
        $profiles = $db->select('user_profiles', ['user_id' => $userId]);
        $profile = !empty($profiles) ? $profiles[0] : null;
        
        // Combine user and profile data
        $userData = [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'phone' => $user['phone_number'] ?? null,
            'avatar_url' => $user['avatar_url'] ?? null,
            'created_at' => $user['created_at'],
            'updated_at' => $user['updated_at'],
            'profile' => $profile
        ];
        
        json_response(200, [
            'success' => true,
            'data' => $userData,
            'database_type' => \App\Core\Database\DatabaseManager::getDatabaseType()
        ]);
        
    } catch (Exception $e) {
        error_log("Get user profile error: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to retrieve user profile']);
    }
}

/**
 * Update user profile data using unified database interface
 */
function updateUserProfile($db, $userId) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            json_response(400, ['error' => 'Invalid JSON input']);
            return;
        }
        
        // Validate and sanitize input
        $allowedFields = ['name', 'phone_number', 'avatar_url'];
        $updateData = [];
        
        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $updateData[$field] = $input[$field];
            }
        }
        
        if (empty($updateData)) {
            json_response(400, ['error' => 'No valid fields to update']);
            return;
        }
        
        // Add updated timestamp
        $updateData['updated_at'] = date('Y-m-d H:i:s');
        
        // Update user using unified interface
        $affectedRows = $db->update('users', $updateData, ['id' => $userId]);
        
        if ($affectedRows === 0) {
            json_response(404, ['error' => 'User not found or no changes made']);
            return;
        }
        
        // Get updated user data
        $users = $db->select('users', ['id' => $userId], [
            'fields' => ['id', 'name', 'email', 'phone_number', 'avatar_url', 'updated_at']
        ]);
        
        json_response(200, [
            'success' => true,
            'message' => 'Profile updated successfully',
            'data' => $users[0],
            'database_type' => \App\Core\Database\DatabaseManager::getDatabaseType()
        ]);
        
    } catch (Exception $e) {
        error_log("Update user profile error: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to update user profile']);
    }
}

/**
 * Helper function for JSON responses
 */
function json_response($status, $data) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_PRETTY_PRINT);
}
?>