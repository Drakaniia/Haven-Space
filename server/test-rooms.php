<?php
require_once __DIR__ . '/src/Core/Database/Connection.php';

use App\Core\Database\Connection;

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Check rooms table structure
    echo "=== ROOMS TABLE STRUCTURE ===\n";
    $stmt = $pdo->prepare("DESCRIBE rooms");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $column) {
        echo "{$column['Field']} - {$column['Type']} - {$column['Null']} - {$column['Default']}\n";
    }
    
    echo "\n=== ROOMS DATA ===\n";
    $stmt = $pdo->prepare("SELECT * FROM rooms LIMIT 5");
    $stmt->execute();
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($rooms as $room) {
        echo "Room ID: {$room['id']}, Property ID: {$room['property_id']}, Title: {$room['title']}\n";
    }
    
    echo "\n=== PROPERTIES WITH ROOMS COUNT ===\n";
    $stmt = $pdo->prepare("
        SELECT p.id, p.title, COUNT(r.id) as room_count 
        FROM properties p 
        LEFT JOIN rooms r ON p.id = r.property_id 
        WHERE p.deleted_at IS NULL 
        GROUP BY p.id 
        LIMIT 5
    ");
    $stmt->execute();
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($properties as $property) {
        echo "Property ID: {$property['id']}, Title: {$property['title']}, Rooms: {$property['room_count']}\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>