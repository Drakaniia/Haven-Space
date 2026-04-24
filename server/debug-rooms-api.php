<?php
require_once __DIR__ . '/src/Core/Database/Connection.php';

use App\Core\Database\Connection;

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Test the exact query from the API for property ID 4
    $propertyId = 4;
    
    echo "=== TESTING ROOM QUERY FOR PROPERTY ID $propertyId ===\n";
    
    // Get room counts
    $roomCountStmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_rooms,
            SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_rooms
        FROM rooms 
        WHERE property_id = ? AND deleted_at IS NULL
    ");
    $roomCountStmt->execute([$propertyId]);
    $roomCountData = $roomCountStmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Room count data:\n";
    print_r($roomCountData);
    
    // Get detailed room information
    $roomDetailsStmt = $pdo->prepare("
        SELECT 
            id,
            room_number,
            room_type,
            capacity,
            status,
            description,
            price as room_price
        FROM rooms 
        WHERE property_id = ? AND deleted_at IS NULL
        ORDER BY room_number ASC
    ");
    $roomDetailsStmt->execute([$propertyId]);
    $roomDetails = $roomDetailsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "\nRoom details count: " . count($roomDetails) . "\n";
    echo "First 3 rooms:\n";
    
    foreach (array_slice($roomDetails, 0, 3) as $room) {
        echo "Room ID: {$room['id']}, Number: {$room['room_number']}, Type: {$room['room_type']}, Status: {$room['status']}\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
?>