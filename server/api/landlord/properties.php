<?php
/**
 * Landlord Properties API
 * GET /api/landlord/properties.php - Returns all properties for the logged-in landlord
 * POST /api/landlord/properties.php - Create a new property listing
 *
 * Returns all properties for the logged-in landlord with:
 * - Property details
 * - Room counts (total, occupied)
 * - Monthly revenue
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Handle POST request - Create new property
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Authenticate user and authorize as landlord
    $user = Middleware::authorize(['landlord']);
    $landlordId = $user['user_id'];

    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!isset($input['propertyName']) || !isset($input['propertyAddress']) || !isset($input['propertyPrice'])) {
        json_response(400, ['error' => 'Missing required fields: propertyName, propertyAddress, propertyPrice']);
    }

    try {
        $pdo = Connection::getInstance()->getPdo();

        // Insert new property
        $stmt = $pdo->prepare("
            INSERT INTO properties 
            (landlord_id, title, description, address, latitude, longitude, price, status, listing_moderation_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review')
        ");

        $status = isset($input['propertyStatus']) ? $input['propertyStatus'] : 'available';
        $latitude = isset($input['propertyLatitude']) && $input['propertyLatitude'] !== '' ? floatval($input['propertyLatitude']) : null;
        $longitude = isset($input['propertyLongitude']) && $input['propertyLongitude'] !== '' ? floatval($input['propertyLongitude']) : null;

        $stmt->execute([
            $landlordId,
            $input['propertyName'],
            $input['propertyDescription'] ?? '',
            $input['propertyAddress'],
            $latitude,
            $longitude,
            floatval($input['propertyPrice']),
            $status
        ]);

        $propertyId = $pdo->lastInsertId();

        // Insert amenities if provided
        if (isset($input['amenities']) && is_array($input['amenities'])) {
            $amenityStmt = $pdo->prepare("
                INSERT INTO property_amenities (property_id, amenity_name)
                VALUES (?, ?)
            ");

            foreach ($input['amenities'] as $amenity) {
                $amenityStmt->execute([$propertyId, $amenity]);
            }
        }

        json_response(201, [
            'success' => true,
            'data' => [
                'property_id' => $propertyId,
                'message' => 'Property created successfully'
            ]
        ]);

    } catch (Exception $e) {
        error_log('Create property error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        json_response(500, ['error' => 'Failed to create property: ' . $e->getMessage()]);
    }
}

// Handle GET request - List properties
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Authenticate user and authorize as landlord
    $user = Middleware::authorize(['landlord']);
    $landlordId = $user['user_id'];

    try {
        $pdo = Connection::getInstance()->getPdo();

    $stmt = $pdo->prepare("
        SELECT 
            p.id,
            p.title,
            p.description,
            p.address,
            p.price,
            p.status,
            p.listing_moderation_status,
            p.created_at,
            COUNT(DISTINCT r.id) as total_rooms,
            COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms,
            COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN r.price ELSE 0 END), 0) as monthly_revenue,
            lp.property_type,
            pl.city,
            pl.province
        FROM properties p
        LEFT JOIN rooms r ON p.id = r.property_id
        LEFT JOIN landlord_profiles lp ON lp.user_id = p.landlord_id
        LEFT JOIN property_locations pl ON pl.landlord_id = lp.id AND pl.is_primary = TRUE
        WHERE p.landlord_id = ? AND p.deleted_at IS NULL
        GROUP BY p.id, p.title, p.description, p.address, p.price, p.status, p.listing_moderation_status, p.created_at, lp.property_type, pl.city, pl.province
        ORDER BY p.created_at DESC
    ");
    $stmt->execute([$landlordId]);
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get amenities for all properties
    $propertyIds = array_column($properties, 'id');
    $amenitiesMap = [];
    if (!empty($propertyIds)) {
        $placeholders = implode(',', array_fill(0, count($propertyIds), '?'));
        $amenitiesStmt = $pdo->prepare("
            SELECT property_id, amenity_name 
            FROM property_amenities 
            WHERE property_id IN ($placeholders)
        ");
        $amenitiesStmt->execute($propertyIds);
        $amenitiesRows = $amenitiesStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($amenitiesRows as $row) {
            if (!isset($amenitiesMap[$row['property_id']])) {
                $amenitiesMap[$row['property_id']] = [];
            }
            $amenitiesMap[$row['property_id']][] = $row['amenity_name'];
        }
    }

    // Transform data for frontend
    $transformedProperties = array_map(function($property) use ($amenitiesMap) {
        $totalRooms = intval($property['total_rooms']);
        $occupiedRooms = intval($property['occupied_rooms']);
        $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100) : 0;

        // Determine status based on occupancy
        $displayStatus = 'active';
        if ($property['listing_moderation_status'] === 'rejected') {
            $displayStatus = 'inactive';
        } elseif ($occupancyRate === 100 && $totalRooms > 0) {
            $displayStatus = 'full';
        }

        // Map property_type from landlord_profiles to frontend format
        $typeMapping = [
            'Single unit' => 'boarding-house',
            'Multi-unit' => 'boarding-house',
            'Apartment' => 'apartment',
            'Dormitory' => 'dormitory',
        ];
        $type = isset($typeMapping[$property['property_type']]) 
            ? $typeMapping[$property['property_type']] 
            : 'boarding-house';

        return [
            'id' => intval($property['id']),
            'name' => htmlspecialchars($property['title']),
            'type' => $type,
            'description' => htmlspecialchars($property['description'] ?? ''),
            'address' => htmlspecialchars($property['address']),
            'city' => htmlspecialchars($property['city'] ?? ''),
            'province' => htmlspecialchars($property['province'] ?? ''),
            'price' => floatval($property['price']),
            'status' => $displayStatus,
            'total_rooms' => $totalRooms,
            'occupied_rooms' => $occupiedRooms,
            'monthly_revenue' => floatval($property['monthly_revenue']),
            'created_at' => $property['created_at'],
            'amenities' => $amenitiesMap[$property['id']] ?? [],
        ];
    }, $properties);

    json_response(200, [
        'data' => [
            'properties' => $transformedProperties,
            'total_count' => count($transformedProperties),
        ],
    ]);

} catch (Exception $e) {
    error_log('Landlord properties API error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    json_response(500, ['error' => 'Failed to load properties: ' . $e->getMessage()]);
}
}

// Method not allowed
json_response(405, ['error' => 'Method not allowed']);
