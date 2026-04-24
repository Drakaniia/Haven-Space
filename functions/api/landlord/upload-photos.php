<?php
/**
 * Landlord Upload Photos API
 * POST /api/landlord/upload-photos.php
 *
 * Uploads property photos and returns their URLs
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

// Authenticate user and authorize as landlord
$user = Middleware::authorize(['landlord']);

// Check if files were uploaded
if (empty($_FILES['photos'])) {
    json_response(400, ['error' => 'No photos provided']);
}

try {
    $uploadedUrls = [];
    $files = $_FILES['photos'];
    
    // Handle both single and multiple file uploads
    if (is_array($files['name'])) {
        $fileCount = count($files['name']);
        
        for ($i = 0; $i < $fileCount; $i++) {
            if ($files['error'][$i] === UPLOAD_ERR_OK) {
                $uploadedUrl = uploadSinglePhoto(
                    $files['tmp_name'][$i],
                    $files['name'][$i],
                    $files['size'][$i],
                    $files['type'][$i]
                );
                
                if ($uploadedUrl) {
                    $uploadedUrls[] = $uploadedUrl;
                }
            }
        }
    } else {
        // Single file upload
        if ($files['error'] === UPLOAD_ERR_OK) {
            $uploadedUrl = uploadSinglePhoto(
                $files['tmp_name'],
                $files['name'],
                $files['size'],
                $files['type']
            );
            
            if ($uploadedUrl) {
                $uploadedUrls[] = $uploadedUrl;
            }
        }
    }
    
    if (empty($uploadedUrls)) {
        json_response(400, ['error' => 'Failed to upload photos']);
    }
    
    json_response(200, [
        'message' => 'Photos uploaded successfully',
        'data' => [
            'urls' => $uploadedUrls,
        ],
    ]);
} catch (Exception $e) {
    error_log('Photo upload error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to upload photos: ' . $e->getMessage()]);
}

/**
 * Upload a single photo file
 */
function uploadSinglePhoto(string $tmpName, string $originalName, int $size, string $type): ?string
{
    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!in_array($type, $allowedTypes)) {
        error_log("Invalid file type: $type");
        return null;
    }
    
    // Validate file size (5MB max)
    $maxSize = 5 * 1024 * 1024;
    if ($size > $maxSize) {
        error_log("File too large: $size bytes");
        return null;
    }
    
    // Create upload directory
    $uploadDir = __DIR__ . '/../../storage/properties/temp/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Generate unique filename
    $ext = pathinfo($originalName, PATHINFO_EXTENSION);
    $newName = 'photo_' . uniqid() . '_' . time() . '.' . $ext;
    $targetPath = $uploadDir . $newName;
    
    // Move uploaded file
    if (!move_uploaded_file($tmpName, $targetPath)) {
        error_log("Failed to move uploaded file to: $targetPath");
        return null;
    }
    
    // Return relative URL
    return '/storage/properties/temp/' . $newName;
}
