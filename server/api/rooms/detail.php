<?php
/**
 * Public Room Detail API
 * GET /api/rooms/detail?id={propertyId}
 * 
 * Returns detailed information for a single property (no authentication required)
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../../src/Core/Database/Connection.php';

use App\Core\Database\Connection;

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

try {
    $pdo = Connection::getInstance()->getPdo();

    // Get property ID from query parameter
    $propertyId = $_GET['id'] ?? null;

    if (!$propertyId) {
        json_response(400, ['error' => 'Property ID is required']);
    }

    // Fetch property details
    $query = "
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
            u.last_name as landlord_last_name
        FROM properties p
        LEFT JOIN users u ON p.landlord_id = u.id
        WHERE p.id = ? 
          AND p.deleted_at IS NULL 
          AND p.listing_moderation_status = 'published'
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute([$propertyId]);
    $property = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$property) {
        json_response(404, ['error' => 'Property not found']);
    }

    // Get property details (amenities, city, province, etc.)
    $amenities = [];
    $city = '';
    $province = '';
    $propertyType = '';
    $deposit = '';
    $minStay = '';
    $houseRules = [];
    
    // Try to get amenities from property_amenities table
    try {
        $amenityStmt = $pdo->prepare("
            SELECT amenity_name 
            FROM property_amenities 
            WHERE property_id = ?
        ");
        $amenityStmt->execute([$propertyId]);
        $amenityRows = $amenityStmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($amenityRows as $row) {
            $amenities[] = $row['amenity_name'];
        }
    } catch (PDOException $e) {
        error_log('Property amenities fetch error: ' . $e->getMessage());
    }
    
    // Try to get additional details from property_details table if it exists
    try {
        $detailStmt = $pdo->prepare("
            SELECT 
                city, 
                province, 
                property_type,
                deposit,
                min_stay,
                house_rules
            FROM property_details 
            WHERE property_id = ?
        ");
        $detailStmt->execute([$propertyId]);
        $detailData = $detailStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($detailData) {
            $city = $detailData['city'] ?? '';
            $province = $detailData['province'] ?? '';
            $propertyType = $detailData['property_type'] ?? '';
            $deposit = $detailData['deposit'] ?? '';
            $minStay = $detailData['min_stay'] ?? '';
            
            if (!empty($detailData['house_rules'])) {
                $houseRules = json_decode($detailData['house_rules'], true) ?: [];
            }
        }
    } catch (PDOException $e) {
        // property_details table doesn't exist or error occurred
        error_log('Property details fetch error: ' . $e->getMessage());
    }

    // Get all property photos
    $images = [];
    $coverImage = '/assets/images/placeholder-room.svg';
    
    try {
        $photoStmt = $pdo->prepare("
            SELECT photo_url, is_cover 
            FROM property_photos 
            WHERE property_id = ? 
            ORDER BY is_cover DESC, id ASC
        ");
        $photoStmt->execute([$propertyId]);
        $photos = $photoStmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($photos as $photo) {
            if (!empty($photo['photo_url'])) {
                $images[] = $photo['photo_url'];
                if ($photo['is_cover']) {
                    $coverImage = $photo['photo_url'];
                }
            }
        }
        
        // If no images found, use placeholder
        if (empty($images)) {
            $images[] = $coverImage;
        }
    } catch (PDOException $e) {
        // property_photos table doesn't exist
        $images[] = $coverImage;
    }

    // Get available rooms for this property
    $rooms = [];
    try {
        // First, try the new schema with room_number, room_type, capacity
        $roomStmt = $pdo->prepare("
            SELECT 
                id,
                room_number,
                room_type,
                price,
                status,
                capacity
            FROM rooms 
            WHERE property_id = ? 
              AND deleted_at IS NULL
            ORDER BY room_type, price
        ");
        $roomStmt->execute([$propertyId]);
        $rooms = $roomStmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        // If columns don't exist, try the old schema
        error_log('Rooms fetch error (trying old schema): ' . $e->getMessage());
        try {
            $roomStmt = $pdo->prepare("
                SELECT 
                    id,
                    title as room_type,
                    price,
                    status
                FROM rooms 
                WHERE property_id = ?
                ORDER BY price
            ");
            $roomStmt->execute([$propertyId]);
            $roomsOld = $roomStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Transform old schema to new format
            foreach ($roomsOld as $room) {
                $rooms[] = [
                    'id' => $room['id'],
                    'room_number' => 'N/A',
                    'room_type' => $room['room_type'],
                    'price' => $room['price'],
                    'status' => $room['status'],
                    'capacity' => 1,
                ];
            }
        } catch (PDOException $e2) {
            error_log('Rooms fetch error (old schema): ' . $e2->getMessage());
        }
    }

    // Get landlord profile info
    $landlordProperties = 0;
    $landlordRating = 0;
    
    try {
        $landlordStmt = $pdo->prepare("
            SELECT COUNT(*) as property_count
            FROM properties 
            WHERE landlord_id = ? 
              AND deleted_at IS NULL
              AND listing_moderation_status = 'published'
        ");
        $landlordStmt->execute([$property['landlord_id']]);
        $landlordData = $landlordStmt->fetch(PDO::FETCH_ASSOC);
        $landlordProperties = $landlordData['property_count'] ?? 0;
        
        // TODO: Calculate actual landlord rating from reviews
        $landlordRating = 4.7;
    } catch (PDOException $e) {
        error_log('Landlord info fetch error: ' . $e->getMessage());
    }

    // Determine badges
    $badges = [];
    if ($property['listing_moderation_status'] === 'published') {
        $badges[] = 'verified';
    }
    
    // Check if newly created (within last 7 days)
    if (!empty($property['created_at'])) {
        $createdAt = new DateTime($property['created_at']);
        $now = new DateTime();
        $daysDiff = $now->diff($createdAt)->days;
        if ($daysDiff <= 7) {
            $badges[] = 'new';
        }
    }

    // Build room types string
    $roomTypes = [];
    foreach ($rooms as $room) {
        if (!in_array($room['room_type'], $roomTypes)) {
            $roomTypes[] = $room['room_type'];
        }
    }
    $roomTypesString = !empty($roomTypes) ? implode(' & ', $roomTypes) : 'Available';

    // Calculate availability
    $availableRooms = 0;
    foreach ($rooms as $room) {
        if ($room['status'] === 'available') {
            $availableRooms++;
        }
    }
    $availability = $availableRooms > 0 ? 'Available Now' : 'No rooms available';

    // Build response
    $response = [
        'id' => intval($property['id']),
        'title' => htmlspecialchars($property['title']),
        'description' => htmlspecialchars($property['description'] ?? ''),
        'address' => htmlspecialchars($property['address']),
        'city' => htmlspecialchars($city),
        'province' => htmlspecialchars($province),
        'price' => floatval($property['price']),
        'latitude' => $property['latitude'] ? floatval($property['latitude']) : null,
        'longitude' => $property['longitude'] ? floatval($property['longitude']) : null,
        'propertyType' => htmlspecialchars($propertyType),
        'deposit' => htmlspecialchars($deposit),
        'minStay' => htmlspecialchars($minStay),
        'rating' => 4.5, // TODO: Calculate from actual reviews
        'reviews' => 0, // TODO: Get actual review count
        'roomTypes' => $roomTypesString,
        'availability' => $availability,
        'availableRooms' => $availableRooms,
        'totalRooms' => count($rooms),
        'amenities' => $amenities,
        'houseRules' => $houseRules,
        'images' => $images,
        'coverImage' => $coverImage,
        'badges' => $badges,
        'rooms' => array_map(function($room) {
            return [
                'id' => intval($room['id']),
                'roomNumber' => htmlspecialchars($room['room_number']),
                'roomType' => htmlspecialchars($room['room_type']),
                'price' => floatval($room['price']),
                'status' => htmlspecialchars($room['status']),
                'capacity' => intval($room['capacity']),
            ];
        }, $rooms),
        'landlord' => [
            'id' => intval($property['landlord_id']),
            'name' => htmlspecialchars(trim(($property['landlord_first_name'] ?? '') . ' ' . ($property['landlord_last_name'] ?? ''))),
            'properties' => $landlordProperties,
            'rating' => $landlordRating,
        ],
        'createdAt' => $property['created_at'],
    ];

    json_response(200, ['data' => $response]);

} catch (Exception $e) {
    error_log('Property detail API error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    json_response(500, ['error' => 'Failed to load property details', 'debug' => $e->getMessage()]);
}
