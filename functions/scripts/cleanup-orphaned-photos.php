<?php
/**
 * Cleanup Orphaned Photos Script
 * 
 * This script removes photos that reference deleted or non-existent properties.
 */

require_once __DIR__ . '/../src/Core/bootstrap.php';
require_once __DIR__ . '/../src/Core/Database/Connection.php';

use App\Core\Database\Connection;

echo "🧹 Cleaning up orphaned photos...\n";

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Find orphaned photos
    $orphanQuery = "
        SELECT pp.id, pp.photo_url, pp.property_id
        FROM property_photos pp
        LEFT JOIN properties p ON pp.property_id = p.id
        WHERE p.id IS NULL OR p.deleted_at IS NOT NULL
    ";
    
    $stmt = $pdo->prepare($orphanQuery);
    $stmt->execute();
    $orphans = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($orphans)) {
        echo "✅ No orphaned photos found.\n";
        exit(0);
    }
    
    echo "Found " . count($orphans) . " orphaned photos:\n";
    foreach ($orphans as $orphan) {
        echo "  - Photo ID {$orphan['id']}: {$orphan['photo_url']} (property_id: {$orphan['property_id']})\n";
    }
    
    // Delete orphaned photos
    $deleteQuery = "
        DELETE pp FROM property_photos pp
        LEFT JOIN properties p ON pp.property_id = p.id
        WHERE p.id IS NULL OR p.deleted_at IS NOT NULL
    ";
    
    $deleteStmt = $pdo->prepare($deleteQuery);
    $deleteStmt->execute();
    $deletedCount = $deleteStmt->rowCount();
    
    echo "✅ Deleted {$deletedCount} orphaned photos.\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "🎉 Orphaned photo cleanup completed!\n";