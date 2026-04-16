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
    $enrichedProperties = array_map(function($property) use ($pdo) {
        $propertyId = $property['id'];
        
        // Get property details for amenities (if table exists)
        $amenities = [];
        $city = '';
        $province = '';
        try {
            $detailStmt = $pdo->prepare("SELECT amenities, city, province, property_type FROM property_details WHERE property_id = ?");
            $detailStmt->execute([$propertyId]);
            $detailData = $detailStmt->fetch(PDO::FETCH_ASSOC);
            if ($detailData) {
                if (!empty($detailData['amenities'])) {
                    $amenities = json_decode($detailData['amenities'], true) ?: [];
                }
                $city = $detailData['city'] ?? '';
                $province = $detailData['province'] ?? '';
            }
        } catch (PDOException $e) {
            // property_details table doesn't exist
        }

        // Get property photo
        $image = '/assets/images/placeholder-room.svg';
        try {
            $photoStmt = $pdo->prepare("SELECT photo_url FROM property_photos WHERE property_id = ? AND is_cover = 1 LIMIT 1");
            $photoStmt->execute([$propertyId]);
            $photoData = $photoStmt->fetch(PDO::FETCH_ASSOC);
            if ($photoData && !empty($photoData['photo_url'])) {
                $image = $photoData['photo_url'];
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
            'roomTypes' => 'Available',
            'availableRooms' => 0,
            'totalRooms' => 0,
            'amenities' => $amenities,
            'image' => $image,
            'images' => [],
            'badges' => $badges,
            'rooms' => [],
            'landlord' => [
                'id' => intval($property['landlord_id']),
                'name' => htmlspecialchars(($property['landlord_first_name'] ?? '') . ' ' . ($property['landlord_last_name'] ?? '')),
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
    json_response(500, ['error' => 'Failed to load properties', 'debug' => $e->getMessage()]);
}