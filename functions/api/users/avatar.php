<?php

/**
 * User Avatar Upload API
 * Handles user avatar image uploads
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../middleware.php';

use App\Core\Database;
use App\Api\Middleware;

// CORS is handled by cors.php middleware

// Authenticate user
$user = Middleware::authenticate();
if (!$user) {
    json_response(401, ['error' => 'Unauthorized']);
    return;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
    return;
}

uploadAvatar($user['user_id']);

/**
 * Upload user avatar
 */
function uploadAvatar($userId) {
    try {
        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
            json_response(400, ['error' => 'No valid file uploaded']);
            return;
        }
        
        $file = $_FILES['avatar'];
        
        // Validate file size (max 2MB)
        if ($file['size'] > 2 * 1024 * 1024) {
            json_response(400, ['error' => 'File size must be less than 2MB']);
            return;
        }
        
        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $allowedTypes)) {
            json_response(400, ['error' => 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed']);
            return;
        }
        
        // Create uploads directory if it doesn't exist
        $uploadDir = __DIR__ . '/../../uploads/avatars/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Generate unique filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'avatar_' . $userId . '_' . time() . '.' . $extension;
        $filepath = $uploadDir . $filename;
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            json_response(500, ['error' => 'Failed to save uploaded file']);
            return;
        }
        
        // Update user avatar URL in database
        $db = Database::getInstance();
        $avatarUrl = '/uploads/avatars/' . $filename;
        
        $stmt = $db->prepare("UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?");
        $result = $stmt->execute([$avatarUrl, $userId]);
        
        if (!$result) {
            // Clean up uploaded file if database update fails
            unlink($filepath);
            json_response(500, ['error' => 'Failed to update avatar']);
            return;
        }
        
        json_response(200, [
            'message' => 'Avatar uploaded successfully',
            'avatar_url' => $avatarUrl
        ]);
        
    } catch (Exception $e) {
        error_log("Error uploading avatar: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to upload avatar']);
    }
}