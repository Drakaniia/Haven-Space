<?php
/**
 * Popular Locations API
 * GET /api/rooms/popular-locations
 * 
 * Returns popular locations based on property count and activity
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
    $limit = min(intval($_GET['limit'] ?? 6), 20); // Default to 6, max 20

    // Simple hardcoded query for testing
    $query = "SELECT a.city, a.province, COUNT(*) as property_count FROM properties p JOIN addresses a ON p.address_id = a.id WHERE p.deleted_at IS NULL GROUP BY a.city, a.province ORDER BY property_count DESC LIMIT :limit";
    
    error_log("Executing query: " . $query);
    error_log("Limit parameter: " . $limit);

    $stmt = $pdo->prepare($query);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Clean and format the locations
    $popularLocations = array_map(function($location) {
        $city = trim($location['city'] ?? '');
        $province = trim($location['province'] ?? '');
        
        // Create location name from city and province
        $locationName = $city;
        if (!empty($province) && $province !== $city) {
            $locationName .= ', ' . $province;
        }
        
        // Clean up common location name issues
        $locationName = preg_replace('/^(City of|Municipality of)\s+/i', '', $locationName);
        $locationName = trim($locationName);
        
        // Create display name and search value
        $displayName = $locationName;
        $searchValue = $locationName;
        
        // Special handling for known university areas
        if (stripos($locationName, 'Diliman') !== false || stripos($locationName, 'UP') !== false) {
            $displayName = 'UP Area';
            $searchValue = 'University of the Philippines';
        } elseif (stripos($locationName, 'Ateneo') !== false || stripos($locationName, 'Loyola') !== false) {
            $displayName = 'Ateneo';
            $searchValue = 'Ateneo de Manila';
        } elseif (stripos($locationName, 'Miriam') !== false) {
            $displayName = 'Miriam';
            $searchValue = 'Miriam College';
        }

        return [
            'name' => $displayName,
            'search_value' => $searchValue,
            'property_count' => intval($location['property_count']),
            'avg_price' => 0, // We'll add price calculations later
            'min_price' => 0,
            'max_price' => 0,
            'price_range' => 'Various prices'
        ];
    }, $locations);

    // If we don't have enough locations from the database, add some fallback popular areas
    if (count($popularLocations) < 3) {
        $fallbackLocations = [
            [
                'name' => 'Quezon City',
                'search_value' => 'Quezon City',
                'property_count' => 0,
                'avg_price' => 0,
                'min_price' => 0,
                'max_price' => 0,
                'price_range' => 'Various prices'
            ],
            [
                'name' => 'Manila',
                'search_value' => 'Manila',
                'property_count' => 0,
                'avg_price' => 0,
                'min_price' => 0,
                'max_price' => 0,
                'price_range' => 'Various prices'
            ],
            [
                'name' => 'Makati',
                'search_value' => 'Makati',
                'property_count' => 0,
                'avg_price' => 0,
                'min_price' => 0,
                'max_price' => 0,
                'price_range' => 'Various prices'
            ]
        ];

        // Add fallback locations that aren't already in the list
        $existingNames = array_column($popularLocations, 'name');
        foreach ($fallbackLocations as $fallback) {
            if (!in_array($fallback['name'], $existingNames) && count($popularLocations) < $limit) {
                $popularLocations[] = $fallback;
            }
        }
    }

    json_response(200, [
        'data' => [
            'locations' => array_slice($popularLocations, 0, $limit)
        ]
    ]);

} catch (Exception $e) {
    error_log('Popular locations API error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    json_response(500, ['error' => 'Failed to load popular locations', 'debug' => $e->getMessage()]);
}