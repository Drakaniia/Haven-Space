<?php
/**
 * All Properties API
 * GET /api/properties/all.php - Returns all active properties from all landlords for map display
 * 
 * This endpoint is used by:
 * - Public maps (to show all available properties)
 * - Landlord maps (to show market competition and density)
 * 
 * Returns properties with basic information suitable for map pins
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

use App\Core\Database\Connection;

// Handle GET request - List all active properties
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $pdo = Connection::getInstance()->getPdo();

        // Get all active properties from all landlords with location data
        $stmt = $pdo->prepare("
            SELECT 
                p.id,
                p.title as name,
                p.description,
                p.address,
                p.latitude,
                p.longitude,
                p.price,
                p.status,
                p.listing_moderation_status,
                p.created_at,
                p.landlord_id,
                pd.city,
                pd.province,
                pd.property_type,
                pd.total_rooms as property_total_rooms,
                COUNT(DISTINCT r.id) as rooms_count,
                COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms,
                u.first_name as landlord_first_name,
                u.last_name as landlord_last_name,
                lp.boarding_house_name as landlord_business_name
            FROM properties p
            LEFT JOIN property_details pd ON pd.property_id = p.id
            LEFT JOIN rooms r ON p.id = r.property_id AND r.deleted_at IS NULL
            LEFT JOIN users u ON u.id = p.landlord_id
            LEFT JOIN landlord_profiles lp ON lp.user_id = p.landlord_id
            WHERE p.deleted_at IS NULL 
                AND p.status IN ('available', 'active')
                AND p.listing_moderation_status = 'published'
                AND p.latitude IS NOT NULL 
                AND p.longitude IS NOT NULL
            GROUP BY p.id, p.title, p.description, p.address, p.latitude, p.longitude, p.price, p.status, p.listing_moderation_status, p.created_at, p.landlord_id, pd.city, pd.province, pd.property_type, pd.total_rooms, u.first_name, u.last_name, lp.boarding_house_name
            ORDER BY p.created_at DESC
        ");
        $stmt->execute();
        $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get amenities for all properties
        $propertyIds = array_column($properties, 'id');
        $amenitiesMap = [];
        $photosMap = [];
        
        if (!empty($propertyIds)) {
            $placeholders = implode(',', array_fill(0, count($propertyIds), '?'));
            
            // Get amenities
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

            // Get photos for all properties
            try {
                $photosStmt = $pdo->prepare("
                    SELECT property_id, photo_url, is_cover
                    FROM property_photos
                    WHERE property_id IN ($placeholders)
                    ORDER BY property_id, display_order ASC
                ");
                $photosStmt->execute($propertyIds);
                $photosRows = $photosStmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($photosRows as $row) {
                    $pid = $row['property_id'];
                    if (!isset($photosMap[$pid])) {
                        $photosMap[$pid] = [];
                    }
                    $photosMap[$pid][] = $row['photo_url'];
                }
            } catch (PDOException $e) {
                // property_photos table may not exist yet
                error_log('Photos fetch error: ' . $e->getMessage());
            }
        }

        // Transform data for frontend
        $transformedProperties = array_map(function($property) use ($amenitiesMap, $photosMap) {
            // Use property_total_rooms from property_details if available, otherwise fall back to rooms_count
            $totalRooms = $property['property_total_rooms'] ? intval($property['property_total_rooms']) : intval($property['rooms_count']);
            $occupiedRooms = intval($property['occupied_rooms']);
            $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100) : 0;

            // Determine status based on occupancy
            $displayStatus = 'active';
            if ($occupancyRate === 100 && $totalRooms > 0) {
                $displayStatus = 'full';
            }

            // Map property_type to frontend format
            $typeMapping = [
                'Single unit' => 'boarding-house',
                'Multi-unit' => 'boarding-house',
                'Apartment' => 'apartment',
                'Dormitory' => 'dormitory',
            ];
            $type = isset($typeMapping[$property['property_type']]) 
                ? $typeMapping[$property['property_type']] 
                : 'boarding-house';

            // Determine landlord display name
            $landlordName = $property['landlord_business_name'] 
                ? $property['landlord_business_name']
                : trim($property['landlord_first_name'] . ' ' . $property['landlord_last_name']);

            return [
                'id' => intval($property['id']),
                'name' => htmlspecialchars($property['name']),
                'type' => $type,
                'description' => htmlspecialchars($property['description'] ?? ''),
                'address' => htmlspecialchars($property['address']),
                'latitude' => floatval($property['latitude']),
                'longitude' => floatval($property['longitude']),
                'city' => htmlspecialchars($property['city'] ?? ''),
                'province' => htmlspecialchars($property['province'] ?? ''),
                'price' => floatval($property['price']),
                'status' => $displayStatus,
                'total_rooms' => $totalRooms,
                'occupied_rooms' => $occupiedRooms,
                'occupancy_rate' => $occupancyRate,
                'landlord_id' => intval($property['landlord_id']),
                'landlord_name' => htmlspecialchars($landlordName),
                'created_at' => $property['created_at'],
                'amenities' => $amenitiesMap[$property['id']] ?? [],
                'photos' => $photosMap[$property['id']] ?? [],
            ];
        }, $properties);

        json_response(200, [
            'data' => [
                'properties' => $transformedProperties,
                'total_count' => count($transformedProperties),
            ],
        ]);

    } catch (Exception $e) {
        error_log('All properties API error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        json_response(500, ['error' => 'Failed to load properties: ' . $e->getMessage()]);
    }
}

// Method not allowed
json_response(405, ['error' => 'Method not allowed']);