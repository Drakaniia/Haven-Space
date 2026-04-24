<?php
/**
 * Public Room Listings API
 * GET /api/rooms/public
 * 
 * Returns all published properties (no authentication required)
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

    // Get query parameters
    $search = $_GET['search'] ?? '';
    $priceMin = $_GET['price_min'] ?? null;
    $priceMax = $_GET['price_max'] ?? null;
    $sortBy = $_GET['sort_by'] ?? 'newest';
    $limit = min(intval($_GET['limit'] ?? 20), 50);
    $offset = intval($_GET['offset'] ?? 0);

    // Build query - simple version that works with existing schema
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
        WHERE p.deleted_at IS NULL 
          AND p.listing_moderation_status = 'published'
    ";
    $params = [];

    // Apply search filter
    if (!empty($search)) {
        $query .= " AND (p.title LIKE ? OR p.address LIKE ? OR p.description LIKE ?)";
        $searchParam = "%{$search}%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }

    // Apply price filters
    if ($priceMin !== null) {
        $query .= " AND p.price >= ?";
        $params[] = floatval($priceMin);
    }
    if ($priceMax !== null) {
        $query .= " AND p.price <= ?";
        $params[] = floatval($priceMax);
    }

    // Apply sorting
    switch ($sortBy) {
        case 'price-low':
            $query .= " ORDER BY p.price ASC";
            break;
        case 'price-high':
            $query .= " ORDER BY p.price DESC";
            break;
        case 'newest':
            $query .= " ORDER BY p.created_at DESC";
            break;
        default:
            $query .= " ORDER BY p.created_at DESC";
    }

    // Get total count
    $countQuery = str_replace('SELECT 
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
            u.last_name as landlord_last_name', 'SELECT COUNT(*)', $query);
    $countQuery = preg_replace('/ORDER BY.*/', '', $countQuery);
    
    try {
        $countStmt = $pdo->prepare($countQuery);
        $countStmt->execute($params);
        $totalCount = $countStmt->fetchColumn();
    } catch (PDOException $e) {
        $totalCount = 0;
    }

    // Apply pagination
    $query .= " LIMIT " . intval($limit) . " OFFSET " . intval($offset);

    // Execute main query
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Build simplified response using use() to pass PDO
    // Group properties by ID to prevent any potential duplicates from SQL query
    $uniqueProperties = [];
    foreach ($properties as $property) {
        $uniqueProperties[$property['id']] = $property;
    }
    
    $enrichedProperties = array_map(function($property) use ($pdo) {
        $propertyId = $property['id'];
        
        // Get property details for amenities, capacity, and other info
        $amenities = [];
        $city = '';
        $province = '';
        $capacity = '';
        $minStay = '';
        $availability = '';
        $propertyTotalRooms = 0;
        try {
            $detailStmt = $pdo->prepare("SELECT amenities, city, province, property_type, capacity, min_stay, availability, total_rooms FROM property_details WHERE property_id = ?");
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
                $propertyTotalRooms = $detailData['total_rooms'] ? intval($detailData['total_rooms']) : 0;
            }
        } catch (PDOException $e) {
            // property_details table doesn't exist or columns missing
        }

        // Get room counts from rooms table
        $roomsCount = 0;
        $availableRooms = 0;
        $rooms = [];
        try {
            $roomStmt = $pdo->prepare("
                SELECT 
                    COUNT(*) as total_rooms,
                    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_rooms
                FROM rooms 
                WHERE property_id = ? AND deleted_at IS NULL
            ");
            $roomStmt->execute([$propertyId]);
            $roomData = $roomStmt->fetch(PDO::FETCH_ASSOC);
            if ($roomData) {
                $roomsCount = intval($roomData['total_rooms']);
                $availableRooms = intval($roomData['available_rooms']);
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

        // Get property photo
        $image = '/assets/images/placeholder-room.svg';
        $images = [];
        try {
            $photoStmt = $pdo->prepare("SELECT photo_url, is_cover FROM property_photos WHERE property_id = ? ORDER BY display_order");
            $photoStmt->execute([$propertyId]);
            $photos = $photoStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($photos as $photo) {
                $images[] = $photo['photo_url'];
                if ($photo['is_cover'] == 1) {
                    $image = $photo['photo_url'];
                }
            }
            // If no cover image but we have photos, use the first one
            if ($image === '/assets/images/placeholder-room.svg' && !empty($images)) {
                $image = $images[0];
            }
        } catch (PDOException $e) {
            // property_photos table doesn't exist
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

        // Determine room type display
        $roomTypeDisplay = 'Available';
        if (!empty($capacity)) {
            if ($capacity === '1') {
                $roomTypeDisplay = 'Single Room';
            } elseif ($capacity === '2') {
                $roomTypeDisplay = 'Shared (2 persons)';
            } elseif ($capacity === '3') {
                $roomTypeDisplay = 'Shared (3 persons)';
            } elseif ($capacity === '4') {
                $roomTypeDisplay = 'Shared (4 persons)';
            } elseif ($capacity === '5+') {
                $roomTypeDisplay = 'Shared (5+ persons)';
            }
        }

        return [
            'id' => intval($property['id']),
            'title' => htmlspecialchars($property['title']),
            'description' => htmlspecialchars($property['description'] ?? ''),
            'address' => htmlspecialchars($property['address']),
            'city' => $city,
            'province' => $province,
            'price' => floatval($property['price']),
            'latitude' => $property['latitude'] ? floatval($property['latitude']) : null,
            'longitude' => $property['longitude'] ? floatval($property['longitude']) : null,
            'rating' => 4.5,
            'reviews' => 0,
            'roomTypes' => $roomTypeDisplay,
            'availableRooms' => $availableRooms,
            'totalRooms' => $totalRooms,
            'capacity' => $capacity,
            'minStay' => $minStay,
            'availability' => $availability,
            'amenities' => $amenities,
            'image' => $image,
            'images' => $images,
            'badges' => $badges,
            'rooms' => $rooms,
            'landlord' => [
                'id' => intval($property['landlord_id']),
                'name' => htmlspecialchars(($property['landlord_first_name'] ?? '') . ' ' . ($property['landlord_last_name'] ?? '')),
            ],
            'createdAt' => $property['created_at'],
        ];
    }, array_values($uniqueProperties)); // Use array_values to reset keys after deduplication

    json_response(200, [
        'data' => [
            'properties' => $enrichedProperties,
            'total_count' => intval($totalCount),
            'limit' => $limit,
            'offset' => $offset,
        ],
    ]);

} catch (Exception $e) {
    error_log('Public rooms API error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    json_response(500, ['error' => 'Failed to load properties', 'debug' => $e->getMessage()]);
}