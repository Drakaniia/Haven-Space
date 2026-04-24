<?php
/**
 * Landlord Listing Photos API
 * POST /api/landlord/listings/{id}/photos
 *
 * Uploads and saves photos for an existing property listing
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

// Authenticate user and authorize as landlord
$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

// Get property ID from URL
// The router passes it as a function argument; we capture it via $GLOBALS or re-parse the URI
$uri = $_SERVER['REQUEST_URI'];
if (!preg_match('#/api/landlord/listings/(\d+)/photos#', $uri, $matches)) {
    json_response(400, ['error' => 'Invalid property ID']);
}
$propertyId = intval($matches[1]);

// Verify the property belongs to this landlord
try {
    $pdo = Connection::getInstance()->getPdo();

    $checkStmt = $pdo->prepare("SELECT id FROM properties WHERE id = ? AND landlord_id = ? AND deleted_at IS NULL");
    $checkStmt->execute([$propertyId, $landlordId]);
    if (!$checkStmt->fetch()) {
        json_response(403, ['error' => 'Property not found or access denied']);
    }
} catch (PDOException $e) {
    error_log('Listing photos ownership check error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to verify property ownership']);
}

// Check if files were uploaded (field name: propertyPhotos[])
if (empty($_FILES['propertyPhotos']) || empty($_FILES['propertyPhotos']['name'][0])) {
    json_response(400, ['error' => 'No photos provided']);
}

$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
$maxSize = 5 * 1024 * 1024; // 5 MB

try {
    $uploadDir = __DIR__ . '/../../storage/properties/' . $propertyId . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $files = $_FILES['propertyPhotos'];
    $fileCount = count($files['name']);

    // Determine the next display_order offset (in case photos already exist)
    $orderStmt = $pdo->prepare("SELECT COALESCE(MAX(display_order), -1) FROM property_photos WHERE property_id = ?");
    $orderStmt->execute([$propertyId]);
    $maxOrder = intval($orderStmt->fetchColumn());

    $uploadedPhotos = [];

    for ($i = 0; $i < $fileCount; $i++) {
        if ($files['error'][$i] !== UPLOAD_ERR_OK) {
            continue;
        }

        $type = $files['type'][$i];
        $size = $files['size'][$i];

        // Validate type and size
        if (!in_array($type, $allowedTypes)) {
            continue;
        }
        if ($size > $maxSize) {
            continue;
        }

        $originalName = $files['name'][$i];
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $newName = 'listing_' . uniqid() . '_' . time() . '.' . $ext;
        $targetPath = $uploadDir . $newName;

        if (move_uploaded_file($files['tmp_name'][$i], $targetPath)) {
            $uploadedPhotos[] = '/storage/properties/' . $propertyId . '/' . $newName;
        }
    }

    if (empty($uploadedPhotos)) {
        json_response(400, ['error' => 'Failed to upload photos. Check file types and sizes (max 5 MB, jpg/png/webp/gif).']);
    }

    // Insert into property_photos
    $photoStmt = $pdo->prepare("
        INSERT INTO property_photos (property_id, photo_url, is_cover, display_order, created_at)
        VALUES (?, ?, ?, ?, NOW())
    ");

    foreach ($uploadedPhotos as $index => $photoUrl) {
        $displayOrder = $maxOrder + 1 + $index;
        // First photo is cover only if no photos existed before
        $isCover = ($maxOrder === -1 && $index === 0) ? 1 : 0;
        $photoStmt->execute([$propertyId, $photoUrl, $isCover, $displayOrder]);
    }

    json_response(200, [
        'message' => 'Photos uploaded successfully',
        'data' => ['urls' => $uploadedPhotos],
    ]);
} catch (PDOException $e) {
    error_log('Listing photos upload error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to save photos']);
}
