<?php
/**
 * Landlord Profile API
 * Handles saving and retrieving landlord profile/property details during signup
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

/**
 * POST /api/landlord/profile.php
 * Save landlord profile/property details
 * 
 * Request Body:
 * {
 *   "userId": 123,
 *   "boardingHouseName": "Sunrise Dormitory",
 *   "description": "Nice place...",
 *   "propertyType": "Multi-unit",
 *   "totalRooms": 10
 * }
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!isset($input['userId']) || !isset($input['boardingHouseName'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required fields: userId, boardingHouseName'
        ]);
        exit;
    }

    $userId = intval($input['userId']);
    $boardingHouseName = trim($input['boardingHouseName']);
    $description = isset($input['description']) ? trim($input['description']) : null;
    $propertyType = isset($input['propertyType']) ? $input['propertyType'] : null;
    $totalRooms = isset($input['totalRooms']) ? intval($input['totalRooms']) : 0;

    // Validate boarding house name length
    if (strlen($boardingHouseName) < 2 || strlen($boardingHouseName) > 255) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Boarding house name must be between 2 and 255 characters'
        ]);
        exit;
    }

    // Validate total rooms
    if ($totalRooms < 1) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Total rooms must be at least 1'
        ]);
        exit;
    }

    // Validate property type
    $validPropertyTypes = ['Single unit', 'Multi-unit', 'Apartment', 'Dormitory'];
    if ($propertyType && !in_array($propertyType, $validPropertyTypes)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid property type'
        ]);
        exit;
    }

    try {
        $db = getDB();

        // Check if landlord profile already exists
        $stmt = $db->prepare("SELECT id FROM landlord_profiles WHERE user_id = ?");
        $stmt->execute([$userId]);
        $existingProfile = $stmt->fetch();

        if ($existingProfile) {
            // Update existing profile
            $stmt = $db->prepare("
                UPDATE landlord_profiles 
                SET boarding_house_name = ?, boarding_house_description = ?, 
                    property_type = ?, total_rooms = ?, available_rooms = ?
                WHERE user_id = ?
            ");
            $stmt->execute([
                $boardingHouseName, $description, $propertyType, 
                $totalRooms, $totalRooms, $userId
            ]);

            $profileId = $existingProfile['id'];
        } else {
            // Insert new profile
            $stmt = $db->prepare("
                INSERT INTO landlord_profiles 
                (user_id, boarding_house_name, boarding_house_description, 
                 property_type, total_rooms, available_rooms)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $userId, $boardingHouseName, $description, 
                $propertyType, $totalRooms, $totalRooms
            ]);

            $profileId = $db->lastInsertId();
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'profileId' => $profileId,
                'boardingHouseName' => $boardingHouseName,
                'propertyType' => $propertyType,
                'totalRooms' => $totalRooms,
                'availableRooms' => $totalRooms
            ]
        ]);
    } catch (PDOException $e) {
        error_log("Error saving landlord profile: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to save landlord profile. Please try again.'
        ]);
    }
    exit;
}

/**
 * GET /api/landlord/profile.php?userId={userId}
 * Get landlord profile
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
            SELECT * FROM landlord_profiles WHERE user_id = ? LIMIT 1
        ");
        $stmt->execute([$userId]);
        $profile = $stmt->fetch();

        if (!$profile) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Landlord profile not found'
            ]);
            exit;
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'profileId' => $profile['id'],
                'boardingHouseName' => $profile['boarding_house_name'],
                'description' => $profile['boarding_house_description'],
                'propertyType' => $profile['property_type'],
                'totalRooms' => intval($profile['total_rooms']),
                'availableRooms' => intval($profile['available_rooms'])
            ]
        ]);
    } catch (PDOException $e) {
        error_log("Error fetching landlord profile: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch landlord profile. Please try again.'
        ]);
    }
    exit;
}

http_response_code(405);
echo json_encode([
    'success' => false,
    'error' => 'Method not allowed'
]);
