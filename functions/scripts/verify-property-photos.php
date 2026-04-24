<?php
/**
 * Verify Property Photos Script
 * 
 * This script verifies that the property-photo relationship is working correctly
 * and that the API returns the expected data structure.
 */

require_once __DIR__ . '/../src/Core/bootstrap.php';
require_once __DIR__ . '/../src/Core/Database/Connection.php';

use App\Core\Database\Connection;

echo "🔍 Verifying property-photo relationships...\n\n";

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Get properties with their photo counts
    $query = "
        SELECT 
            p.id,
            p.title,
            a.address_line_1 as address,
            COUNT(pp.id) as photo_count,
            GROUP_CONCAT(pp.photo_url ORDER BY pp.display_order) as photo_urls
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        LEFT JOIN property_photos pp ON p.id = pp.property_id
        WHERE p.deleted_at IS NULL 
          AND p.listing_moderation_status = 'published'
        GROUP BY p.id, p.title, a.address_line_1
        ORDER BY photo_count DESC
        LIMIT 10
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($properties)) {
        echo "❌ No published properties found.\n";
        exit(1);
    }
    
    echo "📊 Property-Photo Analysis (Top 10 by photo count):\n";
    echo str_repeat("=", 80) . "\n";
    
    foreach ($properties as $property) {
        echo "🏠 Property ID: {$property['id']}\n";
        echo "   Title: {$property['title']}\n";
        echo "   Address: " . substr($property['address'], 0, 50) . "...\n";
        echo "   Photo Count: {$property['photo_count']}\n";
        
        if ($property['photo_count'] > 0) {
            $photos = explode(',', $property['photo_urls']);
            echo "   Photos:\n";
            foreach ($photos as $i => $photo) {
                echo "     " . ($i + 1) . ". " . basename($photo) . "\n";
            }
        } else {
            echo "   Photos: None (will use placeholder)\n";
        }
        echo "\n";
    }
    
    // Test the API response format
    echo "🧪 Testing API Response Format...\n";
    echo str_repeat("=", 80) . "\n";
    
    // Simulate the API query
    $apiQuery = "
        SELECT 
            p.id,
            p.title,
            p.description,
            a.address_line_1 as address,
            p.price,
            p.latitude,
            p.longitude,
            p.listing_moderation_status,
            p.created_at,
            p.landlord_id,
            u.first_name as landlord_first_name,
            u.last_name as landlord_last_name
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        LEFT JOIN users u ON p.landlord_id = u.id
        WHERE p.deleted_at IS NULL 
          AND p.listing_moderation_status = 'published'
        LIMIT 3
    ";
    
    $apiStmt = $pdo->prepare($apiQuery);
    $apiStmt->execute();
    $apiProperties = $apiStmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($apiProperties as $property) {
        $propertyId = $property['id'];
        
        // Get photos for this property (same logic as API)
        $image = '/assets/images/placeholder-room.svg';
        $images = [];
        
        $photoStmt = $pdo->prepare("SELECT photo_url, is_cover FROM property_photos WHERE property_id = ? ORDER BY display_order");
        $photoStmt->execute([$propertyId]);
        $photos = $photoStmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($photos as $photo) {
            $images[] = $photo['photo_url'];
            if ($photo['is_cover'] == 1) {
                $image = $photo['photo_url'];
            }
        }
        
        // If no cover image but we have photos, use the first one
        if ($image === '/assets/images/placeholder-room.svg' && !empty($images)) {
            $image = $images[0];
        }
        
        echo "🔍 Property ID: {$propertyId}\n";
        echo "   Title: {$property['title']}\n";
        echo "   Cover Image: " . basename($image) . "\n";
        echo "   All Images: [" . implode(', ', array_map('basename', $images)) . "]\n";
        echo "   Images Count: " . count($images) . "\n";
        echo "   ✅ API will return: 1 property object with " . count($images) . " photos\n\n";
    }
    
    // Check for potential issues
    echo "🔍 Checking for Potential Issues...\n";
    echo str_repeat("=", 80) . "\n";
    
    // Check for properties with same title/address (potential duplicates)
    $duplicateCheck = "
        SELECT title, address, COUNT(*) as count
        FROM properties 
        LEFT JOIN addresses a ON properties.address_id = a.id
        WHERE deleted_at IS NULL 
        GROUP BY title, address 
        HAVING COUNT(*) > 1
    ";
    
    $dupStmt = $pdo->prepare($duplicateCheck);
    $dupStmt->execute();
    $duplicates = $dupStmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (!empty($duplicates)) {
        echo "⚠️  Found potential duplicate properties:\n";
        foreach ($duplicates as $dup) {
            echo "   - '{$dup['title']}' at '{$dup['address']}' ({$dup['count']} copies)\n";
        }
        echo "\n   💡 Run fix-duplicate-properties.php to clean these up.\n\n";
    } else {
        echo "✅ No duplicate properties found.\n\n";
    }
    
    // Check for orphaned photos
    $orphanCheck = "
        SELECT COUNT(*) as orphan_count
        FROM property_photos pp
        LEFT JOIN properties p ON pp.property_id = p.id
        WHERE p.id IS NULL OR p.deleted_at IS NOT NULL
    ";
    
    $orphanStmt = $pdo->prepare($orphanCheck);
    $orphanStmt->execute();
    $orphanCount = $orphanStmt->fetchColumn();
    
    if ($orphanCount > 0) {
        echo "⚠️  Found {$orphanCount} orphaned photos (photos without valid properties).\n";
        echo "   💡 These should be cleaned up.\n\n";
    } else {
        echo "✅ No orphaned photos found.\n\n";
    }
    
    echo "🎉 Verification completed!\n";
    echo "If you're still seeing duplicate property cards, the issue is likely in the frontend.";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}