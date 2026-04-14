<?php
/**
 * Landlord Property Location API
 * Handles saving and retrieving property locations during signup
 */

// Include centralized CORS configuration
require_once __DIR__ . '/../cors.php';

// Include database configuration
if (!function_exists('getDB')) {
    require_once __DIR__ . '/../../config/database.php';
}

header('Content-Type: application/json');

/**
 * POST /api/landlord/property-location.php
 * Save property location for a landlord
 * 
 * Request Body:
 * {
 *   "userId": 123,
 *   "latitude": 14.5995,
 *   "longitude": 120.9842,
 *   "address": "123 Main St, Manila, Philippines"
 * }
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!isset($input['userId']) || !isset($input['latitude']) || !isset($input['longitude'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required fields: userId, latitude, longitude'
        ]);
        exit;
    }

    $userId = intval($input['userId']);
    $latitude = floatval($input['latitude']);
    $longitude = floatval($input['longitude']);
    $address = $input['address'] ?? '';

    // Validate coordinates are within Philippines bounds
    if ($latitude < 4.5 || $latitude > 21.1 || $longitude < 116.0 || $longitude > 127.0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid coordinates. Location must be within the Philippines.'
        ]);
        exit;
    }

    // Parse address into components
    $addressParts = explode(',', $address);
    $addressLine1 = trim($addressParts[0] ?? '');
    $addressLine2 = isset($addressParts[1]) ? trim($addressParts[1]) : null;
    $city = isset($addressParts[2]) ? trim($addressParts[2]) : null;
    $province = isset($addressParts[3]) ? trim($addressParts[3]) : null;
    $postalCode = isset($addressParts[4]) ? trim($addressParts[4]) : null;
    $country = end($addressParts) ? trim(end($addressParts)) : 'Philippines';

    try {
        $db = getDB();

        // Check if landlord profile exists
        $stmt = $db->prepare("SELECT id FROM landlord_profiles WHERE user_id = ?");
        $stmt->execute([$userId]);
        $landlordProfile = $stmt->fetch();

        if (!$landlordProfile) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Landlord profile not found. Please complete property details first.'
            ]);
            exit;
        }

        $landlordId = $landlordProfile['id'];

        // Check if location already exists
        $stmt = $db->prepare("SELECT id FROM property_locations WHERE landlord_id = ? AND is_primary = 1");
        $stmt->execute([$landlordId]);
        $existingLocation = $stmt->fetch();

        if ($existingLocation) {
            // Update existing location
            $stmt = $db->prepare("
                UPDATE property_locations 
                SET latitude = ?, longitude = ?, address_line_1 = ?, address_line_2 = ?, 
                    city = ?, province = ?, postal_code = ?, country = ?
                WHERE landlord_id = ? AND is_primary = 1
            ");
            $stmt->execute([
                $latitude, $longitude, $addressLine1, $addressLine2,
                $city, $province, $postalCode, $country, $landlordId
            ]);

            $locationId = $existingLocation['id'];
        } else {
            // Insert new location
            $stmt = $db->prepare("
                INSERT INTO property_locations 
                (landlord_id, latitude, longitude, address_line_1, address_line_2, 
                 city, province, postal_code, country, is_primary)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ");
            $stmt->execute([
                $landlordId, $latitude, $longitude, $addressLine1, $addressLine2,
                $city, $province, $postalCode, $country
            ]);

            $locationId = $db->lastInsertId();
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'locationId' => $locationId,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'address' => $address
            ]
        ]);
    } catch (PDOException $e) {
        error_log("Error saving property location: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to save property location. Please try again.'
        ]);
    }
    exit;
}

/**
 * GET /api/landlord/property-location.php?userId={userId}
 * Get property location for a landlord
 */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['userId'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required parameter: userId'
        ]);
        exit;
    }

    $userId = intval($_GET['userId']);

    try {
        $db = getDB();

        $stmt = $db->prepare("
            SELECT pl.* 
            FROM property_locations pl
            INNER JOIN landlord_profiles lp ON pl.landlord_id = lp.id
            WHERE lp.user_id = ? AND pl.is_primary = 1
            LIMIT 1
        ");
        $stmt->execute([$userId]);
        $location = $stmt->fetch();

        if (!$location) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Property location not found'
            ]);
            exit;
        }

        // Reconstruct full address
        $addressParts = array_filter([
            $location['address_line_1'],
            $location['address_line_2'],
            $location['city'],
            $location['province'],
            $location['postal_code'],
            $location['country']
        ]);
        $fullAddress = implode(', ', $addressParts);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'latitude' => floatval($location['latitude']),
                'longitude' => floatval($location['longitude']),
                'address' => $fullAddress,
                'city' => $location['city'],
                'province' => $location['province']
            ]
        ]);
    } catch (PDOException $e) {
        error_log("Error fetching property location: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch property location. Please try again.'
        ]);
    }
    exit;
}

http_response_code(405);
echo json_encode([
    'success' => false,
    'error' => 'Method not allowed'
]);
