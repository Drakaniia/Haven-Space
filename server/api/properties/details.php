<?php
/**
 * Property Details API
 * GET /api/properties/details/{id} - Returns detailed property information with rooms
 * 
 * This endpoint is used by:
 * - Property detail modals/pages
 * - Room selection interfaces
 * 
 * Returns complete property information including all rooms and their photos
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

use App\Core\Database\Connection;

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

// Get property ID from URL path
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$pathParts = explode('/', trim($pathInfo, '/'));
$propertyId = end($pathParts);

if (!$propertyId || !is_numeric($propertyId)) {
    json_response(400, ['error' => 'Property ID is required']);
}

try {
    $pdo = Connection::getInstance()->getPdo();

    // Get property basic information
    $stmt = $pdo->prepare("
        SELECT 
            p.id,
            p.title,
            p.description,
            p.address,
            p.price,
            p.latitude,
            p.longitude,
            p.listing_moderation_status,
            p.created_at,
            p.landlord_id,
            u.first_name as landlord_first_name,
            u.last_name as landlord_last_name,
            lp.boarding_house_name as landlord_business_name
        FROM properties p
        LEFT JOIN users u ON p.landlord_id = u.id
        LEFT JOIN landlord_profiles lp ON lp.user_id = p.landlord_id
        WHERE p.id = ? 
          AND p.deleted_at IS NULL 
          AND p.listing_moderation_status = 'published'
    ");
    $stmt->execute([$propertyId]);
    $property = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$property) {
        json_response(404, ['error' => 'Property not found']);
    }

    // Get property details
    $amenities = [];
    $city = '';
    $province = '';
    $capacity = '';
    $minStay = '';
    $availability = '';
    $propertyType = '';
    $propertyTotalRooms = 0;
    
    try {
        $detailStmt = $pdo->prepare("
            SELECT amenities, city, province, property_type, capacity, min_stay, availability, total_rooms 
            FROM property_details 
            WHERE property_id = ?
        ");
        $detailStmt->execute([$propertyId]);
        $detailData = $detailStmt->fetch(PDO::FETCH_ASSOC);
        if ($detailData) {
            if (!empty($detailData['amenities'])) {
                $amenities = json_decode($detailData['amenities'], true) ?: [];
            }
            $city = $detailData['city'] ?? '';
            $province = $detailData['province'] ?? '';
            $capacity = $detailData['capacity'] ?? '';
            $minStay = $detailData['min_stay'] ?? '';
            $availability = $detailData['availability'] ?? '';
            $propertyType = $detailData['property_type'] ?? '';
            $propertyTotalRooms = $detailData['total_rooms'] ? intval($detailData['total_rooms']) : 0;
        }
    } catch (PDOException $e) {
        // property_details table doesn't exist
    }

    // Get property photos
    $propertyPhotos = [];
    $coverImage = '/assets/images/placeholder-property.svg';
    
    try {
        $photoStmt = $pdo->prepare("
            SELECT photo_url, is_cover 
            FROM property_photos 
            WHERE property_id = ? 
            ORDER BY display_order ASC
        ");
        $photoStmt->execute([$propertyId]);
        $photos = $photoStmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($photos as $photo) {
            $propertyPhotos[] = $photo['photo_url'];
            if ($photo['is_cover'] == 1) {
                $coverImage = $photo['photo_url'];
            }
        }
        
        // If no cover image but we have photos, use the first one
        if ($coverImage === '/assets/images/placeholder-property.svg' && !empty($propertyPhotos)) {
            $coverImage = $propertyPhotos[0];
        }
    } catch (PDOException $e) {
        // property_photos table doesn't exist
    }

    // Get detailed room information
    $rooms = [];
    $roomsCount = 0;
    $availableRooms = 0;
    
    try {
        // Get room counts
        $roomCountStmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_rooms,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_rooms
            FROM rooms 
            WHERE property_id = ? AND deleted_at IS NULL
        ");
        $roomCountStmt->execute([$propertyId]);
        $roomCountData = $roomCountStmt->fetch(PDO::FETCH_ASSOC);
        if ($roomCountData) {
            $roomsCount = intval($roomCountData['total_rooms']);
            $availableRooms = intval($roomCountData['available_rooms']);
        }

        // Get detailed room information
        $roomDetailsStmt = $pdo->prepare("
            SELECT 
                id,
                room_number,
                room_type,
                capacity,
                status,
                price as room_price,
                title
            FROM rooms 
            WHERE property_id = ? AND deleted_at IS NULL
            ORDER BY room_number ASC
        ");
        $roomDetailsStmt->execute([$propertyId]);
        $roomDetails = $roomDetailsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($roomDetails as $room) {
            $roomId = $room['id'];
            
            // Get room photos
            $roomPhotos = [];
            try {
                $roomPhotoStmt = $pdo->prepare("
                    SELECT photo_url 
                    FROM room_photos 
                    WHERE room_id = ? 
                    ORDER BY display_order ASC
                ");
                $roomPhotoStmt->execute([$roomId]);
                $photos = $roomPhotoStmt->fetchAll(PDO::FETCH_ASSOC);
                $roomPhotos = array_column($photos, 'photo_url');
            } catch (PDOException $e) {
                // room_photos table might not exist
            }

            $rooms[] = [
                'id' => intval($room['id']),
                'room_number' => $room['room_number'] ?? "Room " . $room['id'],
                'room_name' => $room['room_type'] ?? $room['room_number'] ?? "Room " . $room['id'],
                'type' => $room['room_type'] ?? 'Standard Room',
                'capacity' => intval($room['capacity'] ?? 1),
                'status' => $room['status'] ?? 'available',
                'availability' => ($room['status'] ?? 'available') === 'available' ? 'Available' : 'Occupied',
                'description' => $room['title'] ?? 'Comfortable room with all basic amenities.',
                'price' => $room['room_price'] ? floatval($room['room_price']) : floatval($property['price']),
                'photos' => $roomPhotos,
                'image' => !empty($roomPhotos) ? $roomPhotos[0] : '/assets/images/placeholder-room.svg'
            ];
        }
    } catch (PDOException $e) {
        // rooms table doesn't exist
    }

    // Use property_total_rooms if available, otherwise use rooms count
    $totalRooms = $propertyTotalRooms > 0 ? $propertyTotalRooms : $roomsCount;

    // Determine landlord display name
    $landlordName = $property['landlord_business_name'] 
        ? $property['landlord_business_name']
        : trim($property['landlord_first_name'] . ' ' . $property['landlord_last_name']);

    // Build response
    $response = [
        'id' => intval($property['id']),
        'title' => htmlspecialchars($property['title']),
        'description' => htmlspecialchars($property['description'] ?? ''),
        'address' => htmlspecialchars($property['address']),
        'city' => $city,
        'province' => $province,
        'property_type' => $propertyType,
        'price' => floatval($property['price']),
        'latitude' => $property['latitude'] ? floatval($property['latitude']) : null,
        'longitude' => $property['longitude'] ? floatval($property['longitude']) : null,
        'capacity' => $capacity,
        'min_stay' => $minStay,
        'availability' => $availability,
        'amenities' => $amenities,
        'cover_image' => $coverImage,
        'property_photos' => $propertyPhotos,
        'total_rooms' => $totalRooms,
        'available_rooms' => $availableRooms,
        'rooms' => $rooms,
        'landlord' => [
            'id' => intval($property['landlord_id']),
            'name' => htmlspecialchars($landlordName),
        ],
        'created_at' => $property['created_at'],
    ];

    json_response(200, ['data' => $response]);

} catch (Exception $e) {
    error_log('Property details API error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    json_response(500, ['error' => 'Failed to load property details', 'debug' => $e->getMessage()]);
}