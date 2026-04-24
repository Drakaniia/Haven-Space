<?php
/**
 * Test the rooms API with proper authentication
 */

require_once __DIR__ . '/../server/src/Core/Database/Connection.php';

use App\Core\Database\Connection;

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Find a landlord user to test with
    $stmt = $pdo->prepare("SELECT id, email FROM users WHERE role = 'landlord' LIMIT 1");
    $stmt->execute();
    $landlord = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$landlord) {
        echo "No landlord user found in database\n";
        exit(1);
    }
    
    echo "Found landlord user: {$landlord['email']} (ID: {$landlord['id']})\n";
    
    // Check if this landlord has any properties
    $propStmt = $pdo->prepare("SELECT id, title FROM properties WHERE landlord_id = ? AND deleted_at IS NULL LIMIT 1");
    $propStmt->execute([$landlord['id']]);
    $property = $propStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$property) {
        echo "No properties found for this landlord\n";
        exit(1);
    }
    
    echo "Found property: {$property['title']} (ID: {$property['id']})\n";
    
    // Test the API endpoints directly (simulating what the frontend does)
    echo "\n=== TESTING API ENDPOINTS ===\n";
    
    // Test 1: Properties API
    echo "1. Testing properties API...\n";
    $propertiesUrl = "http://localhost:8000/api/landlord/properties.php?id={$property['id']}";
    echo "URL: $propertiesUrl\n";
    
    // Test 2: Rooms API
    echo "\n2. Testing rooms API...\n";
    $roomsUrl = "http://localhost:8000/api/landlord/rooms.php?property_id={$property['id']}";
    echo "URL: $roomsUrl\n";
    
    echo "\nNote: These URLs require authentication tokens to work properly.\n";
    echo "The frontend should be using these exact URLs with proper JWT tokens.\n";
    
    // Check if there are any rooms for this property
    $roomStmt = $pdo->prepare("SELECT COUNT(*) as room_count FROM rooms WHERE property_id = ? AND deleted_at IS NULL");
    $roomStmt->execute([$property['id']]);
    $roomCount = $roomStmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Room count for property {$property['id']}: {$roomCount['room_count']}\n";
    
    if ($roomCount['room_count'] == 0) {
        echo "\nCreating test rooms for property {$property['id']}...\n";
        
        // Create a few test rooms
        $insertStmt = $pdo->prepare("
            INSERT INTO rooms (property_id, landlord_id, title, room_number, price, status, capacity, room_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $testRooms = [
            ['Room 101', '101', 5000, 'available', 1, 'single'],
            ['Room 102', '102', 6000, 'occupied', 2, 'shared'],
            ['Room 103', '103', 5500, 'maintenance', 1, 'single']
        ];
        
        foreach ($testRooms as $room) {
            $insertStmt->execute([
                $property['id'],
                $landlord['id'],
                $room[0], // title
                $room[1], // room_number
                $room[2], // price
                $room[3], // status
                $room[4], // capacity
                $room[5]  // room_type
            ]);
        }
        
        echo "Created " . count($testRooms) . " test rooms\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>