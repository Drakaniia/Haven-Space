<?php
require_once __DIR__ . '/src/Core/Database/Connection.php';

use App\Core\Database\Connection;

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Check table structure
    echo "Checking properties table structure:\n";
    $stmt = $pdo->query("DESCRIBE properties");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $col) {
        echo "- " . $col['Field'] . " (" . $col['Type'] . ")\n";
    }
    
    // Test simple query
    echo "\nTesting simple query:\n";
    $stmt = $pdo->query("SELECT p.id, a.address_line_1 as address, p.price, p.status, p.listing_moderation_status FROM properties p LEFT JOIN addresses a ON p.address_id = a.id LIMIT 3");
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($results as $row) {
        echo "ID: " . $row['id'] . ", Address: " . $row['address'] . ", Price: " . $row['price'] . ", Status: " . $row['status'] . ", Moderation: " . $row['listing_moderation_status'] . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}