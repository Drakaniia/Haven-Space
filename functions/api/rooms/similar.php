<?php
/**
 * Similar Properties API
 * GET /api/rooms/similar?id={propertyId}&limit={limit}
 * 
 * Returns similar properties based on location, price range, and property type
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

    // Get parameters
    $propertyId = $_GET['id'] ?? null;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 3;
    $limit = max(1, min($limit, 10)); // Ensure limit is between 1 and 10

    if (!$propertyId) {
        json_response(400, ['error' => 'Property ID is required']);
    }

    // First, get the current property details to determine similarity criteria
    $currentPropertyQuery = "
        SELECT 
            p.price,
            a.city,
            a.province,
            pd.property_type,
            p.landlord_id
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        LEFT JOIN property_details pd ON p.id = pd.property_id
        WHERE p.id = ?
          AND p.deleted_at IS NULL 
          AND p.listing_moderation_status = 'published'
    ";

    $stmt = $pdo->prepare($currentPropertyQuery);
    $stmt->execute([$propertyId]);
    $currentProperty = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$currentProperty) {
        json_response(404, ['error' => 'Property not found']);
    }

    // Calculate price range (+/- 30%)
    $minPrice = $currentProperty['price'] * 0.7;
    $maxPrice = $currentProperty['price'] * 1.3;

    // Get similar properties
    $similarQuery = "
        SELECT 
            p.id,
            p.title,
            p.description,
            p.price,
            a.address_line_1 as address,
            a.city,
            a.province,
            pd.property_type,
            (SELECT AVG(r.rating) FROM reviews r WHERE r.property_id = p.id) as rating,
            (SELECT COUNT(*) FROM reviews r WHERE r.property_id = p.id) as review_count,
            (SELECT photo_url FROM property_photos WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        LEFT JOIN property_details pd ON p.id = pd.property_id
        WHERE p.id != ?
          AND p.deleted_at IS NULL 
          AND p.listing_moderation_status = 'published'
          AND p.price BETWEEN ? AND ?
          AND (
              a.city = ? OR
              a.province = ?
          )
        ORDER BY 
            -- Prioritize same city
            CASE WHEN a.city = ? THEN 0 ELSE 1 END,
            -- Then same property type
            CASE WHEN pd.property_type = ? THEN 0 ELSE 1 END,
            -- Then by rating
            rating DESC,
            -- Then by price proximity
            ABS(p.price - ?) ASC
        LIMIT " . intval($limit);

    $similarStmt = $pdo->prepare($similarQuery);
    $similarStmt->execute([
        $propertyId,
        $minPrice,
        $maxPrice,
        $currentProperty['city'],
        $currentProperty['province'],
        $currentProperty['city'],
        $currentProperty['property_type'],
        $currentProperty['price']
    ]);

    $similarProperties = $similarStmt->fetchAll(PDO::FETCH_ASSOC);

    // Format the response
    $formattedProperties = [];
    
    foreach ($similarProperties as $property) {
        $formattedProperties[] = [
            'id' => intval($property['id']),
            'title' => htmlspecialchars($property['title']),
            'description' => htmlspecialchars($property['description'] ?? ''),
            'price' => floatval($property['price']),
            'address' => htmlspecialchars($property['address'] ?? ''),
            'city' => htmlspecialchars($property['city'] ?? ''),
            'province' => htmlspecialchars($property['province'] ?? ''),
            'propertyType' => htmlspecialchars($property['property_type'] ?? ''),
            'rating' => $property['rating'] ? round(floatval($property['rating']), 1) : 0,
            'reviewCount' => intval($property['review_count'] ?? 0),
            'coverImage' => $property['cover_image'] ? htmlspecialchars($property['cover_image']) : '/assets/images/placeholder-room.svg',
        ];
    }

    json_response(200, ['data' => $formattedProperties]);

} catch (Exception $e) {
    error_log('Similar properties API error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    json_response(500, ['error' => 'Failed to load similar properties', 'debug' => $e->getMessage()]);
}