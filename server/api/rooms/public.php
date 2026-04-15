<?php
/**
 * Public Room Listings API
 * GET /api/rooms/public
 * 
 * Returns all published properties (no authentication required):
 * - Property details with images
 * - Room information
 * - Amenities
 * - Location data
 * - Pricing
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

    // Get query parameters for filtering
    $search = $_GET['search'] ?? '';
    $priceMin = $_GET['price_min'] ?? null;
    $priceMax = $_GET['price_max'] ?? null;
    $roomType = $_GET['room_type'] ?? '';
    $amenities = $_GET['amenities'] ?? '';
    $sortBy = $_GET['sort_by'] ?? 'recommended';
    $limit = intval($_GET['limit'] ?? 20);
    $offset = intval($_GET['offset'] ?? 0);

    // Base query - only get published properties
    $baseQuery = "
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
            l.id as landlord_id,
            l.first_name as landlord_first_name,
            l.last_name as landlord_last_name
        FROM properties p
        LEFT JOIN landlords l ON p.landlord_id = l.id
        WHERE p.deleted_at IS NULL 
          AND p.listing_moderation_status = 'published'
    ";

    $params = [];

    // Apply search filter
    if (!empty($search)) {
        $baseQuery .= " AND (
            p.title LIKE ? 
            OR p.address LIKE ? 
            OR p.description LIKE ?
        )";
        $searchParam = "%{$search}%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }

    // Apply price filters
    if ($priceMin !== null) {
        $baseQuery .= " AND p.price >= ?";
        $params[] = floatval($priceMin);
    }
    if ($priceMax !== null) {
        $baseQuery .= " AND p.price <= ?";
        $params[] = floatval($priceMax);
    }

    // Apply room type filter (will be handled in application layer)
    // For now, we filter by property title/description containing the room type
    if (!empty($roomType) && $roomType !== 'any') {
        $baseQuery .= " AND (
            p.title LIKE ? 
            OR p.description LIKE ?
        )";
        $roomTypeParam = "%{$roomType}%";
        $params[] = $roomTypeParam;
        $params[] = $roomTypeParam;
    }

    // Apply sorting
    switch ($sortBy) {
        case 'price-low':
            $baseQuery .= " ORDER BY p.price ASC";
            break;
        case 'price-high':
            $baseQuery .= " ORDER BY p.price DESC";
            break;
        case 'newest':
            $baseQuery .= " ORDER BY p.created_at DESC";
            break;
        default:
            $baseQuery .= " ORDER BY p.created_at DESC";
            break;
    }

    // Get total count
    $countQuery = "SELECT COUNT(*) FROM ($baseQuery) as count_table";
    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($params);
    $totalCount = $countStmt->fetchColumn();

    // Apply pagination
    $baseQuery .= " LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;

    // Execute main query
    $stmt = $pdo->prepare($baseQuery);
    $stmt->execute($params);
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Enrich each property with additional data
    $enrichedProperties = array_map(function($property) use ($pdo) {
        $propertyId = $property['id'];

        // Get rooms for this property
        $roomsStmt = $pdo->prepare("
            SELECT id, title, price, status
            FROM rooms
            WHERE property_id = ? AND deleted_at IS NULL
            ORDER BY price ASC
        ");
        $roomsStmt->execute([$propertyId]);
        $rooms = $roomsStmt->fetchAll(PDO::FETCH_ASSOC);

        // Get amenities (assuming there's a property_amenities table or similar)
        // For now, we'll return empty array - this can be enhanced later
        $amenities = [];

        // Get property images (assuming there's a property_images table)
        // For now, we'll use a placeholder or first image
        $imageStmt = $pdo->prepare("
            SELECT image_url
            FROM property_images
            WHERE property_id = ? AND is_primary = 1
            LIMIT 1
        ");
        $imageStmt->execute([$propertyId]);
        $primaryImage = $imageStmt->fetch(PDO::FETCH_ASSOC);

        // Get all images for gallery
        $allImagesStmt = $pdo->prepare("
            SELECT image_url
            FROM property_images
            WHERE property_id = ?
            ORDER BY sort_order ASC
        ");
        $allImagesStmt->execute([$propertyId]);
        $allImages = $allImagesStmt->fetchAll(PDO::FETCH_COLUMN);

        // Calculate rating (if you have a reviews/ratings table)
        // For now, use placeholder
        $ratingStmt = $pdo->prepare("
            SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
            FROM property_reviews
            WHERE property_id = ? AND is_approved = 1
        ");
        $ratingStmt->execute([$propertyId]);
        $ratingData = $ratingStmt->fetch(PDO::FETCH_ASSOC);

        $avgRating = $ratingData['avg_rating'] ? round(floatval($ratingData['avg_rating']), 1) : 0;
        $reviewCount = intval($ratingData['review_count']);

        // Get location data if available
        $locationStmt = $pdo->prepare("
            SELECT address_line_1, city, province
            FROM property_locations
            WHERE property_id = ? AND is_primary = 1
            LIMIT 1
        ");
        $locationStmt->execute([$propertyId]);
        $locationData = $locationStmt->fetch(PDO::FETCH_ASSOC);

        // Determine badges
        $badges = [];
        if ($property['listing_moderation_status'] === 'published') {
            $badges[] = 'verified';
        }
        
        // Check if newly created (within last 7 days)
        $createdAt = new DateTime($property['created_at']);
        $now = new DateTime();
        $daysDiff = $now->diff($createdAt)->days;
        if ($daysDiff <= 7) {
            $badges[] = 'new';
        }

        // Build room types string
        $roomTypes = array_map(function($room) {
            return $room['title'];
        }, $rooms);
        $roomTypesString = implode(' & ', array_unique($roomTypes));

        return [
            'id' => intval($property['id']),
            'title' => htmlspecialchars($property['title']),
            'description' => htmlspecialchars($property['description'] ?? ''),
            'address' => htmlspecialchars($property['address']),
            'city' => $locationData ? htmlspecialchars($locationData['city'] ?? '') : '',
            'province' => $locationData ? htmlspecialchars($locationData['province'] ?? '') : '',
            'price' => floatval($property['price']),
            'latitude' => $property['latitude'] ? floatval($property['latitude']) : null,
            'longitude' => $property['longitude'] ? floatval($property['longitude']) : null,
            'rating' => $avgRating > 0 ? $avgRating : 4.5, // Default rating for now
            'reviews' => $reviewCount > 0 ? $reviewCount : 0,
            'roomTypes' => $roomTypesString ?: 'Available',
            'availableRooms' => count($rooms),
            'totalRooms' => count($rooms),
            'amenities' => $amenities,
            'image' => $primaryImage ? $primaryImage['image_url'] : '/assets/images/placeholder-room.jpg',
            'images' => $allImages,
            'badges' => $badges,
            'rooms' => array_map(function($room) {
                return [
                    'id' => intval($room['id']),
                    'type' => htmlspecialchars($room['title']),
                    'price' => floatval($room['price']),
                    'availability' => $room['status'] === 'available' ? 'Available' : 'Occupied',
                ];
            }, $rooms),
            'landlord' => [
                'id' => intval($property['landlord_id']),
                'name' => htmlspecialchars($property['landlord_first_name'] . ' ' . $property['landlord_last_name']),
            ],
            'createdAt' => $property['created_at'],
        ];
    }, $properties);

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
    json_response(500, ['error' => 'Failed to load properties: ' . $e->getMessage()]);
}
