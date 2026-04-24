<?php
/**
 * Landlord Update Listing API
 * PUT /api/landlord/listings/{id}
 *
 * Updates an existing property listing
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    $input = $_POST;
}

$propertyId = $input['id'] ?? null;

if (!$propertyId) {
    json_response(400, ['error' => 'Property ID is required']);
}

try {
    $pdo = Connection::getInstance()->getPdo();

    // Begin transaction
    $pdo->beginTransaction();

    // Verify property belongs to landlord
    $checkStmt = $pdo->prepare("SELECT id FROM properties WHERE id = ? AND landlord_id = ?");
    $checkStmt->execute([$propertyId, $landlordId]);
    if (!$checkStmt->fetch()) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_response(403, ['error' => 'Property not found or access denied']);
    }

    // Update main property table
    $stmt = $pdo->prepare("
        UPDATE properties 
        SET title = ?,
            description = ?,
            address = ?,
            latitude = ?,
            longitude = ?,
            price = ?,
            status = ?,
            updated_at = NOW()
        WHERE id = ? AND landlord_id = ?
    ");

    $status = $input['status'] ?? 'available';
    // Map frontend status to database status
    if ($status === 'active') {
        $status = 'available';
    } elseif ($status === 'inactive') {
        $status = 'hidden';
    }

    $stmt->execute([
        $input['name'] ?? $input['propertyName'],
        $input['description'] ?? $input['propertyDescription'] ?? '',
        $input['address'] ?? $input['propertyAddress'],
        !empty($input['latitude']) ? floatval($input['latitude']) : (!empty($input['propertyLatitude']) ? floatval($input['propertyLatitude']) : null),
        !empty($input['longitude']) ? floatval($input['longitude']) : (!empty($input['propertyLongitude']) ? floatval($input['propertyLongitude']) : null),
        floatval($input['price'] ?? $input['propertyPrice']),
        $status,
        $propertyId,
        $landlordId,
    ]);

    // Update or insert property_details
    if (isset($input['type']) || isset($input['city']) || isset($input['province']) || isset($input['deposit']) || isset($input['total_rooms']) || isset($input['capacity']) || isset($input['min_stay']) || isset($input['availability'])) {
        $detailsCheckStmt = $pdo->prepare("SELECT id FROM property_details WHERE property_id = ?");
        $detailsCheckStmt->execute([$propertyId]);
        $detailsExist = $detailsCheckStmt->fetch();

        if ($detailsExist) {
            // Update existing details
            $detailsStmt = $pdo->prepare("
                UPDATE property_details 
                SET city = ?,
                    province = ?,
                    property_type = ?,
                    deposit = ?,
                    capacity = ?,
                    min_stay = ?,
                    availability = ?,
                    total_rooms = ?,
                    updated_at = NOW()
                WHERE property_id = ?
            ");

            $detailsStmt->execute([
                $input['city'] ?? null,
                $input['province'] ?? null,
                $input['type'] ?? null,
                $input['deposit'] ?? null,
                $input['capacity'] ?? null,
                $input['min_stay'] ?? null,
                $input['availability'] ?? null,
                isset($input['total_rooms']) ? intval($input['total_rooms']) : null,
                $propertyId,
            ]);
        } else {
            // Insert new details
            $detailsStmt = $pdo->prepare("
                INSERT INTO property_details (property_id, city, province, property_type, deposit, capacity, min_stay, availability, total_rooms, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");

            $detailsStmt->execute([
                $propertyId,
                $input['city'] ?? null,
                $input['province'] ?? null,
                $input['type'] ?? null,
                $input['deposit'] ?? null,
                $input['capacity'] ?? null,
                $input['min_stay'] ?? null,
                $input['availability'] ?? null,
                isset($input['total_rooms']) ? intval($input['total_rooms']) : null,
            ]);
        }
    }

    // Update amenities
    if (isset($input['amenities']) && is_array($input['amenities'])) {
        // Delete existing amenities
        $deleteAmenitiesStmt = $pdo->prepare("DELETE FROM property_amenities WHERE property_id = ?");
        $deleteAmenitiesStmt->execute([$propertyId]);

        // Insert new amenities
        if (!empty($input['amenities'])) {
            $amenityStmt = $pdo->prepare("
                INSERT INTO property_amenities (property_id, amenity_name, created_at)
                VALUES (?, ?, NOW())
            ");

            foreach ($input['amenities'] as $amenity) {
                $amenityStmt->execute([$propertyId, $amenity]);
            }
        }
    }

    // Handle photos
    if (isset($input['photos']) && is_array($input['photos'])) {
        // Delete photos marked for deletion
        if (isset($input['photos_to_delete']) && is_array($input['photos_to_delete'])) {
            foreach ($input['photos_to_delete'] as $photoUrl) {
                // Delete from database
                $deletePhotoStmt = $pdo->prepare("DELETE FROM property_photos WHERE property_id = ? AND photo_url = ?");
                $deletePhotoStmt->execute([$propertyId, $photoUrl]);

                // Delete physical file
                $filePath = __DIR__ . '/../../' . ltrim($photoUrl, '/');
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
            }
        }

        // Get existing photos from database
        $existingPhotosStmt = $pdo->prepare("SELECT photo_url FROM property_photos WHERE property_id = ? ORDER BY display_order");
        $existingPhotosStmt->execute([$propertyId]);
        $existingPhotos = $existingPhotosStmt->fetchAll(PDO::FETCH_COLUMN);

        // Update display order for all photos
        $updateOrderStmt = $pdo->prepare("
            UPDATE property_photos 
            SET display_order = ?,
                is_cover = ?,
                updated_at = NOW()
            WHERE property_id = ? AND photo_url = ?
        ");

        foreach ($input['photos'] as $index => $photoUrl) {
            // Check if photo already exists
            if (in_array($photoUrl, $existingPhotos)) {
                // Update existing photo
                $updateOrderStmt->execute([
                    $index,
                    $index === 0 ? 1 : 0,
                    $propertyId,
                    $photoUrl,
                ]);
            } else {
                // Insert new photo
                $insertPhotoStmt = $pdo->prepare("
                    INSERT INTO property_photos (property_id, photo_url, is_cover, display_order, created_at, updated_at)
                    VALUES (?, ?, ?, ?, NOW(), NOW())
                ");

                $insertPhotoStmt->execute([
                    $propertyId,
                    $photoUrl,
                    $index === 0 ? 1 : 0,
                    $index,
                ]);

                // Move photo from temp to permanent location if it's a temp file
                if (strpos($photoUrl, '/temp/') !== false) {
                    $tempPath = __DIR__ . '/../../' . ltrim($photoUrl, '/');
                    $permanentDir = __DIR__ . '/../../storage/properties/' . $propertyId . '/';
                    
                    if (!is_dir($permanentDir)) {
                        mkdir($permanentDir, 0755, true);
                    }
                    
                    $filename = basename($photoUrl);
                    $permanentPath = $permanentDir . $filename;
                    $permanentUrl = '/storage/properties/' . $propertyId . '/' . $filename;
                    
                    if (file_exists($tempPath)) {
                        rename($tempPath, $permanentPath);
                        
                        // Update photo URL in database
                        $updateUrlStmt = $pdo->prepare("UPDATE property_photos SET photo_url = ? WHERE property_id = ? AND photo_url = ?");
                        $updateUrlStmt->execute([$permanentUrl, $propertyId, $photoUrl]);
                    }
                }
            }
        }
    }

    // Commit transaction
    $pdo->commit();

    json_response(200, [
        'message' => 'Listing updated successfully',
        'data' => ['id' => $propertyId],
    ]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Update listing error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    json_response(500, ['error' => 'Failed to update listing: ' . $e->getMessage()]);
}