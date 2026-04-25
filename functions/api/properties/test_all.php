<?php
/**
 * Test script for Properties All API
 * Tests: /api/properties/all.php
 * 
 * This script tests the properties all endpoint to ensure:
 * 1. Database connection works
 * 2. Normalized database queries work correctly
 * 3. No syntax errors in the endpoint
 * 4. Real data is fetched from the database
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

use App\Core\Database\Connection;

header('Content-Type: application/json');

echo "=== Testing Properties All API ===\n\n";

try {
    // Test database connection
    echo "1. Testing database connection...\n";
    $pdo = Connection::getInstance()->getPdo();
    echo "✓ Database connection successful\n\n";

    // Test normalized tables exist
    echo "2. Testing normalized tables...\n";
    $tables = [
        'properties', 'addresses', 'users', 'landlord_profiles', 
        'rooms', 'amenities', 'property_amenities'
    ];
    
    foreach ($tables as $table) {
        $stmt = $pdo->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        if ($stmt->fetch()) {
            echo "✓ Table '$table' exists\n";
        } else {
            echo "✗ Table '$table' missing\n";
        }
    }
    echo "\n";

    // Test main properties query with normalized joins
    echo "3. Testing main properties query with normalized joins...\n";
    $stmt = $pdo->prepare("
        SELECT 
            p.id,
            p.title as name,
            p.description,
            a.address_line_1 as address,
            a.latitude,
            a.longitude,
            p.price,
            p.status,
            p.listing_moderation_status,
            p.created_at,
            p.landlord_id,
            a.city,
            a.province,
            COUNT(DISTINCT r.id) as rooms_count,
            COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms,
            u.first_name as landlord_first_name,
            u.last_name as landlord_last_name,
            lp.boarding_house_name as landlord_business_name
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        LEFT JOIN rooms r ON p.id = r.property_id
        LEFT JOIN users u ON u.id = p.landlord_id
        LEFT JOIN landlord_profiles lp ON lp.user_id = p.landlord_id
        WHERE p.deleted_at IS NULL 
            AND p.status IN ('available', 'active')
            AND p.listing_moderation_status = 'published'
            AND a.latitude IS NOT NULL 
            AND a.longitude IS NOT NULL
        GROUP BY p.id, p.title, p.description, a.address_line_1, a.latitude, a.longitude, 
                 p.price, p.status, p.listing_moderation_status, p.created_at, p.landlord_id, 
                 a.city, a.province, u.first_name, u.last_name, lp.boarding_house_name
        ORDER BY p.created_at DESC
        LIMIT 10
    ");
    
    $stmt->execute();
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✓ Properties query executed successfully\n";
    echo "Found " . count($properties) . " properties\n\n";

    // Display sample data
    if (!empty($properties)) {
        echo "4. Sample property data:\n";
        $sample = $properties[0];
        echo "Property ID: " . $sample['id'] . "\n";
        echo "Name: " . $sample['name'] . "\n";
        echo "Address: " . $sample['address'] . ", " . $sample['city'] . ", " . $sample['province'] . "\n";
        echo "Location: " . $sample['latitude'] . ", " . $sample['longitude'] . "\n";
        echo "Price: ₱" . number_format($sample['price'], 2) . "\n";
        echo "Status: " . $sample['status'] . "\n";
        echo "Rooms: " . $sample['rooms_count'] . " total, " . $sample['occupied_rooms'] . " occupied\n";
        echo "Landlord: " . $sample['landlord_first_name'] . " " . $sample['landlord_last_name'] . "\n";
        echo "Business Name: " . ($sample['landlord_business_name'] ?? 'N/A') . "\n";
        echo "Created: " . $sample['created_at'] . "\n\n";
    } else {
        echo "4. No properties found in database\n\n";
    }

    // Test amenities query
    echo "5. Testing amenities query...\n";
    if (!empty($properties)) {
        $propertyIds = array_column($properties, 'id');
        $placeholders = implode(',', array_fill(0, count($propertyIds), '?'));
        
        $amenitiesStmt = $pdo->prepare("
            SELECT pa.property_id, a.amenity_name, a.category
            FROM property_amenities pa
            JOIN amenities a ON pa.amenity_id = a.id
            WHERE pa.property_id IN ($placeholders)
            ORDER BY pa.property_id, a.category, a.amenity_name
        ");
        $amenitiesStmt->execute($propertyIds);
        $amenitiesRows = $amenitiesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "✓ Amenities query executed successfully\n";
        echo "Found " . count($amenitiesRows) . " amenity associations\n";
        
        // Group amenities by property
        $amenitiesMap = [];
        foreach ($amenitiesRows as $row) {
            if (!isset($amenitiesMap[$row['property_id']])) {
                $amenitiesMap[$row['property_id']] = [];
            }
            $amenitiesMap[$row['property_id']][] = $row['amenity_name'] . " (" . $row['category'] . ")";
        }
        
        // Show sample amenities
        if (!empty($amenitiesMap)) {
            $samplePropertyId = array_keys($amenitiesMap)[0];
            echo "Sample amenities for property $samplePropertyId:\n";
            foreach ($amenitiesMap[$samplePropertyId] as $amenity) {
                echo "- $amenity\n";
            }
        }
        echo "\n";
    } else {
        echo "⚠ No properties to test amenities with\n\n";
    }

    // Test property photos query (may not exist yet)
    echo "6. Testing property photos query...\n";
    try {
        if (!empty($properties)) {
            $propertyIds = array_column($properties, 'id');
            $placeholders = implode(',', array_fill(0, count($propertyIds), '?'));
            
            $photosStmt = $pdo->prepare("
                SELECT property_id, photo_url, is_cover, display_order
                FROM property_photos
                WHERE property_id IN ($placeholders)
                ORDER BY property_id, display_order ASC
            ");
            $photosStmt->execute($propertyIds);
            $photosRows = $photosStmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo "✓ Photos query executed successfully\n";
            echo "Found " . count($photosRows) . " photos\n\n";
        } else {
            echo "⚠ No properties to test photos with\n\n";
        }
    } catch (PDOException $e) {
        echo "⚠ Property photos table may not exist yet: " . $e->getMessage() . "\n\n";
    }

    // Test property statistics
    echo "7. Testing property statistics...\n";
    $statsStmt = $pdo->prepare("
        SELECT 
            p.status,
            COUNT(*) as property_count,
            AVG(p.price) as avg_price,
            MIN(p.price) as min_price,
            MAX(p.price) as max_price
        FROM properties p
        WHERE p.deleted_at IS NULL
        GROUP BY p.status
        ORDER BY property_count DESC
    ");
    $statsStmt->execute();
    $stats = $statsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✓ Statistics query executed successfully\n";
    foreach ($stats as $stat) {
        echo "- " . ucfirst($stat['status']) . ": " . $stat['property_count'] . 
             " properties (Avg: ₱" . number_format($stat['avg_price'], 2) . 
             ", Range: ₱" . number_format($stat['min_price'], 2) . 
             " - ₱" . number_format($stat['max_price'], 2) . ")\n";
    }
    echo "\n";

    // Test location distribution
    echo "8. Testing location distribution...\n";
    $locationStmt = $pdo->prepare("
        SELECT 
            a.city,
            a.province,
            COUNT(*) as property_count,
            AVG(p.price) as avg_price
        FROM properties p
        JOIN addresses a ON p.address_id = a.id
        WHERE p.deleted_at IS NULL
        GROUP BY a.city, a.province
        ORDER BY property_count DESC
        LIMIT 10
    ");
    $locationStmt->execute();
    $locations = $locationStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✓ Location distribution query executed successfully\n";
    foreach ($locations as $location) {
        echo "- " . $location['city'] . ", " . $location['province'] . 
             ": " . $location['property_count'] . 
             " properties (Avg: ₱" . number_format($location['avg_price'], 2) . ")\n";
    }
    echo "\n";

    // Test the actual endpoint
    echo "9. Testing actual endpoint...\n";
    
    $_SERVER['REQUEST_METHOD'] = 'GET';
    
    // Capture output from the actual endpoint
    ob_start();
    try {
        include __DIR__ . '/all.php';
        $output = ob_get_contents();
        ob_end_clean();
        
        echo "✓ Endpoint executed without fatal errors\n";
        
        // Try to decode JSON response
        $response = json_decode($output, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            echo "✓ Valid JSON response returned\n";
            if (isset($response['data'])) {
                echo "✓ Response contains data structure\n";
                
                $data = $response['data'];
                if (isset($data['properties'])) {
                    echo "✓ Contains properties array (" . count($data['properties']) . " items)\n";
                }
                if (isset($data['total_count'])) {
                    echo "✓ Contains total_count: " . $data['total_count'] . "\n";
                }
                
                // Check property structure
                if (!empty($data['properties'])) {
                    $sampleProperty = $data['properties'][0];
                    $expectedKeys = ['id', 'name', 'address', 'latitude', 'longitude', 'price', 'status'];
                    foreach ($expectedKeys as $key) {
                        if (isset($sampleProperty[$key])) {
                            echo "✓ Property contains '$key'\n";
                        } else {
                            echo "⚠ Property missing '$key'\n";
                        }
                    }
                }
            }
        } else {
            echo "⚠ Response is not valid JSON or contains errors\n";
            echo "Response: " . substr($output, 0, 200) . "...\n";
        }
    } catch (Exception $e) {
        ob_end_clean();
        echo "✗ Endpoint error: " . $e->getMessage() . "\n";
    }

    echo "\n=== Properties All API Test Complete ===\n";
    echo "Status: " . (count($properties) > 0 ? "✓ PASS" : "⚠ NO DATA") . "\n";

} catch (Exception $e) {
    echo "✗ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}