<?php

/**
 * Landlord Welcome Settings API
 * Handles welcome message and house rules file management
 */

require_once __DIR__ . '/../../src/Core/Bootstrap.php';

use App\Api\Middleware;
use App\Core\Database\Database;
use App\Core\Upload\UploadHandler;

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$user = Middleware::authorize(['landlord']);
$userId = $user['user_id'];

$db = Database::getInstance()->getConnection();
$uploadHandler = new UploadHandler();

try {
    if ($method === 'GET') {
        // Get welcome settings
        $stmt = $db->prepare('
            SELECT welcome_message, house_rules_file_url, house_rules_file_name, house_rules_file_size
            FROM landlord_profiles
            WHERE user_id = ?
        ');
        $stmt->execute([$userId]);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$settings) {
            json_response(404, ['error' => 'Landlord profile not found']);
            exit;
        }

        json_response(200, ['data' => $settings]);
    } elseif ($method === 'POST') {
        // Save welcome settings
        $welcomeMessage = $_POST['welcome_message'] ?? '';

        if (empty(trim($welcomeMessage))) {
            json_response(400, ['error' => 'Welcome message is required']);
            exit;
        }

        // Check if landlord profile exists
        $stmt = $db->prepare('SELECT id FROM landlord_profiles WHERE user_id = ?');
        $stmt->execute([$userId]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$profile) {
            json_response(404, ['error' => 'Landlord profile not found']);
            exit;
        }

        // Handle file upload if present
        $fileUrl = null;
        $fileName = null;
        $fileSize = null;

        if (isset($_FILES['house_rules_file']) && $_FILES['house_rules_file']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['house_rules_file'];

            // Validate file size (max 10MB)
            if ($file['size'] > 10 * 1024 * 1024) {
                json_response(400, ['error' => 'File must be less than 10MB']);
                exit;
            }

            // Validate file type
            $allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);

            if (!in_array($mimeType, $allowedTypes)) {
                json_response(400, ['error' => 'Only PDF, DOC, and DOCX files are allowed']);
                exit;
            }

            // Upload file
            $fileUrl = $uploadHandler->upload($file, 'house-rules');
            if (!$fileUrl) {
                json_response(500, ['error' => 'Failed to upload file']);
                exit;
            }

            $fileName = $file['name'];
            $fileSize = $file['size'];

            // Delete old file if exists
            $stmt = $db->prepare('SELECT house_rules_file_url FROM landlord_profiles WHERE user_id = ?');
            $stmt->execute([$userId]);
            $oldFile = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($oldFile && $oldFile['house_rules_file_url']) {
                $uploadHandler->delete($oldFile['house_rules_file_url']);
            }
        }

        // Update landlord profile
        if ($fileUrl) {
            $stmt = $db->prepare('
                UPDATE landlord_profiles
                SET welcome_message = ?, house_rules_file_url = ?, house_rules_file_name = ?, house_rules_file_size = ?
                WHERE user_id = ?
            ');
            $stmt->execute([$welcomeMessage, $fileUrl, $fileName, $fileSize, $userId]);
        } else {
            $stmt = $db->prepare('
                UPDATE landlord_profiles
                SET welcome_message = ?
                WHERE user_id = ?
            ');
            $stmt->execute([$welcomeMessage, $userId]);
        }

        json_response(200, ['message' => 'Welcome settings saved successfully']);
    } else {
        json_response(405, ['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    error_log('Welcome settings error: ' . $e->getMessage());
    json_response(500, ['error' => 'Internal server error']);
}
