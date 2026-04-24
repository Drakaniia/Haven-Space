<?php
/**
 * Fix Duplicate Properties Script
 * 
 * This script identifies and removes duplicate property entries that might be causing
 * multiple property cards to appear for the same property.
 */

require_once __DIR__ . '/../src/Core/bootstrap.php';
require_once __DIR__ . '/../src/Core/Database/Connection.php';

use App\Core\Database\Connection;

echo "🔍 Checking for duplicate properties...\n";

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Find potential duplicates based on title, address, and landlord
    $duplicateQuery = "
        SELECT 
            title, 
            address, 
            landlord_id, 
            COUNT(*) as duplicate_count,
            GROUP_CONCAT(id ORDER BY created_at DESC) as property_ids
        FROM properties 
        WHERE deleted_at IS NULL 
        GROUP BY title, address, landlord_id 
        HAVING COUNT(*) > 1
        ORDER BY duplicate_count DESC
    ";
    
    $stmt = $pdo->prepare($duplicateQuery);
    $stmt->execute();
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($duplicates)) {
        echo "✅ No duplicate properties found in database.\n";
        echo "The issue might be in the frontend code or API response handling.\n";
        exit(0);
    }
    
    echo "⚠️  Found " . count($duplicates) . " sets of duplicate properties:\n\n";
    
    foreach ($duplicates as $duplicate) {
        echo "📍 Property: {$duplicate['title']}\n";
        echo "   Address: {$duplicate['address']}\n";
        echo "   Landlord ID: {$duplicate['landlord_id']}\n";
        echo "   Duplicate Count: {$duplicate['duplicate_count']}\n";
        echo "   Property IDs: {$duplicate['property_ids']}\n\n";
    }
    
    // Ask for confirmation before proceeding
    $autoConfirm = isset($argv[1]) && $argv[1] === '--yes';
    
    if (!$autoConfirm) {
        echo "Do you want to remove duplicate properties? (y/N): ";
        $handle = fopen("php://stdin", "r");
        $line = fgets($handle);
        fclose($handle);
        
        if (trim(strtolower($line)) !== 'y') {
            echo "❌ Operation cancelled.\n";
            exit(0);
        }
    } else {
        echo "🤖 Auto-confirmed via --yes flag.\n";
    }
    
    echo "\n🧹 Cleaning up duplicates...\n";
    
    $pdo->beginTransaction();
    
    $totalRemoved = 0;
    
    foreach ($duplicates as $duplicate) {
        $propertyIds = explode(',', $duplicate['property_ids']);
        $keepId = array_shift($propertyIds); // Keep the first (newest) property
        
        echo "📌 Keeping property ID: {$keepId}\n";
        
        foreach ($propertyIds as $removeId) {
            // Get photo count for this property
            $photoStmt = $pdo->prepare("SELECT COUNT(*) FROM property_photos WHERE property_id = ?");
            $photoStmt->execute([$removeId]);
            $photoCount = $photoStmt->fetchColumn();
            
            // Move photos from duplicate to the kept property
            if ($photoCount > 0) {
                echo "   📸 Moving {$photoCount} photos from property {$removeId} to {$keepId}\n";
                $movePhotosStmt = $pdo->prepare("
                    UPDATE property_photos 
                    SET property_id = ? 
                    WHERE property_id = ?
                ");
                $movePhotosStmt->execute([$keepId, $removeId]);
            }
            
            // Move rooms from duplicate to the kept property
            $roomStmt = $pdo->prepare("SELECT COUNT(*) FROM rooms WHERE property_id = ?");
            $roomStmt->execute([$removeId]);
            $roomCount = $roomStmt->fetchColumn();
            
            if ($roomCount > 0) {
                echo "   🏠 Moving {$roomCount} rooms from property {$removeId} to {$keepId}\n";
                $moveRoomsStmt = $pdo->prepare("
                    UPDATE rooms 
                    SET property_id = ? 
                    WHERE property_id = ?
                ");
                $moveRoomsStmt->execute([$keepId, $removeId]);
            }
            
            // Move applications to the kept property
            $appStmt = $pdo->prepare("
                UPDATE applications 
                SET property_id = ? 
                WHERE property_id = ?
            ");
            $appStmt->execute([$keepId, $removeId]);
            
            // Soft delete the duplicate property
            $deleteStmt = $pdo->prepare("
                UPDATE properties 
                SET deleted_at = NOW() 
                WHERE id = ?
            ");
            $deleteStmt->execute([$removeId]);
            
            echo "   ❌ Removed duplicate property ID: {$removeId}\n";
            $totalRemoved++;
        }
        
        echo "\n";
    }
    
    $pdo->commit();
    
    echo "✅ Successfully removed {$totalRemoved} duplicate properties.\n";
    echo "🔄 The kept properties now have all photos and rooms consolidated.\n";
    
} catch (Exception $e) {
    if (isset($pdo)) {
        $pdo->rollBack();
    }
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n🎉 Duplicate property cleanup completed!\n";
echo "Please test the find-a-room page to verify the fix.\n";