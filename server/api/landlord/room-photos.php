<?php
/**
 * Landlord Room Photos API
 * POST /api/landlord/listings/{id}/room-photos
 *
 * Uploads and saves photos for specific rooms within a property listing
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

// Extract property ID from URL
$uri = $_SERVER['REQUEST_URI'];
if (!preg_match('#/api/landlord/listings/(\d+)/room-photos#', $uri, $matches)) {
    json_response(400, ['error' => 'Invalid property ID']);
}

$propertyId = intval($matches[1]);

// Verify property belongs to this landlord
try {
    $pdo = Connection::getInstance()->getPdo();
    
    $stmt = $pdo->prepare("SELECT id FROM properties WHERE id = ? AND landlord_id = ? AND deleted_at IS NULL");
    $stmt->execute([$propertyId, $landlordId]);
    
    if (!$stmt->fetch()) {
        json_response(404, ['error' => 'Property not found or access denied']);
    }
} catch (Exception $e) {
    error_log('Room photos property verification error: ' . $e->getMessage());
    json_response(500, ['error' => 'Database error']);
}

// Get room ID and photos from request
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['roomId']) || !isset($input['photos'])) {
    json_response(400, ['error' => 'Room ID and photos are required']);
}

$roomId = intval($input['roomId']);
$photos = $input['photos'];

if (!is_array($photos) || empty($photos)) {
    json_response(400, ['error' => 'At least one photo is required']);
}

try {
    $pdo->beginTransaction();
    
    // Verify room belongs to this property
    $roomStmt = $pdo->prepare("SELECT id FROM rooms WHERE id = ? AND property_id = ? AND landlord_id = ?");
    $roomStmt->execute([$roomId, $propertyId, $landlordId]);
    
    if (!$roomStmt->fetch()) {
        json_response(404, ['error' => 'Room not found or access denied']);
    }
    
    // For now, we'll store room photos as property photos with a room_id reference
    // This requires adding a room_id column to property_photos table
    // For the current implementation, we'll just store them as property photos
    
    $uploadedPhotos = [];
    $displayOrder = 1;
    
    foreach ($photos as $photoData) {
        if (!isset($photoData['data']) || !isset($photoData['filename'])) {
            continue;
        }
        
        // Decode base64 image data
        $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $photoData['data']));
        
        if (!$imageData) {
            continue;
        }
        
        // Generate unique filename
        $extension = pathinfo($photoData['filename'], PATHINFO_EXTENSION);
        $filename = 'room_' . uniqid() . '_' . time() . '.' . $extension;
        
        // Create upload directory if it doesn't exist
        $uploadDir = __DIR__ . '/../../storage/properties/' . $propertyId;
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $filePath = $uploadDir . '/' . $filename;
        
        // Save file
        if (file_put_contents($filePath, $imageData)) {
            $photoUrl = '/storage/properties/' . $propertyId . '/' . $filename;
            
            // Insert into property_photos table
            $photoStmt = $pdo->prepare("
                INSERT INTO property_photos (property_id, photo_url, is_cover, display_order, created_at, updated_at)
                VALUES (?, ?, 0, ?, NOW(), NOW())
            ");
            $photoStmt->execute([$propertyId, $photoUrl, $displayOrder]);
            
            $uploadedPhotos[] = [
                'id' => $pdo->lastInsertId(),
                'url' => $photoUrl,
                'filename' => $filename,
                'room_id' => $roomId
            ];
            
            $displayOrder++;
        }
    }
    
    $pdo->commit();
    
    json_response(200, [
        'message' => 'Room photos uploaded successfully',
        'photos' => $uploadedPhotos
    ]);
    
} catch (Exception $e) {
    $pdo->rollBack();
    error_log('Room photos upload error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to upload room photos']);
}