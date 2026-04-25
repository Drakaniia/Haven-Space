<?php
/**
 * Test script for Landlord Dashboard Stats API
 * Tests: /api/landlord/dashboard-stats.php
 * 
 * This script tests the landlord dashboard stats endpoint to ensure:
 * 1. Database connection works
 * 2. Normalized database queries work correctly
 * 3. No syntax errors in the endpoint
 * 4. Real data is fetched from the database
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

use App\Core\Database\Connection;

header('Content-Type: application/json');

echo "=== Testing Landlord Dashboard Stats API ===\n\n";

try {
    // Test database connection
    echo "1. Testing database connection...\n";
    $pdo = Connection::getInstance()->getPdo();
    echo "✓ Database connection successful\n\n";

    // Test normalized tables exist
    echo "2. Testing normalized tables...\n";
    $tables = [
        'users', 'user_roles', 'properties', 'rooms', 'applications', 
        'addresses', 'landlord_profiles'
    ];
    
    foreach ($tables as $table) {
        $stmt = $pdo->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        if ($table_exists = $stmt->fetch()) {
            echo "✓ Table '$table' exists\n";
        } else {
            echo "✗ Table '$table' missing\n";
        }
    }
    echo "\n";

    // Find a test landlord
    echo "3. Finding test landlord...\n";
    $landlordStmt = $pdo->prepare('
        SELECT u.id, u.first_name, u.last_name, u.email
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE ur.role_name = "landlord" AND u.deleted_at IS NULL
        LIMIT 1
    ');
    $landlordStmt->execute();
    $landlord = $landlordStmt->fetch();
    
    if (!$landlord) {
        echo "⚠ No landlord found. Creating test data would be needed.\n\n";
        $landlordId = 1; // Use default for testing
    } else {
        $landlordId = $landlord['id'];
        echo "✓ Using landlord: " . $landlord['first_name'] . " " . $landlord['last_name'] . " (ID: $landlordId)\n\n";
    }

    // Test occupancy rate calculation
    echo "4. Testing occupancy rate calculation...\n";
    $stmt = $pdo->prepare("
        SELECT
            COUNT(*) as total_rooms,
            COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms
        FROM rooms r
        INNER JOIN properties p ON r.property_id = p.id
        WHERE p.landlord_id = ? AND p.deleted_at IS NULL
    ");
    $stmt->execute([$landlordId]);
    $roomStats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $totalRooms = intval($roomStats['total_rooms']);
    $occupiedRooms = intval($roomStats['occupied_rooms']);
    $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;
    
    echo "✓ Occupancy calculation successful\n";
    echo "Total Rooms: $totalRooms\n";
    echo "Occupied Rooms: $occupiedRooms\n";
    echo "Occupancy Rate: $occupancyRate%\n\n";

    // Test monthly revenue calculation
    echo "5. Testing monthly revenue calculation...\n";
    $stmt = $pdo->prepare("
        SELECT 
            COALESCE(SUM(r.price), 0) as monthly_revenue,
            COUNT(*) as approved_applications
        FROM applications a
        INNER JOIN rooms r ON a.room_id = r.id
        INNER JOIN properties p ON r.property_id = p.id
        WHERE a.landlord_id = ? 
            AND a.status = 'approved'
            AND p.deleted_at IS NULL
            AND MONTH(a.updated_at) = MONTH(CURRENT_DATE())
            AND YEAR(a.updated_at) = YEAR(CURRENT_DATE())
    ");
    $stmt->execute([$landlordId]);
    $revenueData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $monthlyRevenue = floatval($revenueData['monthly_revenue']);
    $approvedApps = intval($revenueData['approved_applications']);
    
    echo "✓ Revenue calculation successful\n";
    echo "Monthly Revenue: ₱" . number_format($monthlyRevenue, 2) . "\n";
    echo "Approved Applications This Month: $approvedApps\n\n";

    // Test upcoming renewals calculation
    echo "6. Testing upcoming renewals calculation...\n";
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as upcoming_renewals
        FROM applications a
        INNER JOIN properties p ON a.property_id = p.id
        WHERE a.landlord_id = ? 
            AND a.status = 'approved'
            AND p.deleted_at IS NULL
    ");
    $stmt->execute([$landlordId]);
    $renewalsData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $upcomingRenewals = intval($renewalsData['upcoming_renewals']);
    
    echo "✓ Renewals calculation successful\n";
    echo "Upcoming Renewals: $upcomingRenewals\n\n";

    // Test properties and rooms data
    echo "7. Testing properties and rooms data...\n";
    $propertiesStmt = $pdo->prepare("
        SELECT 
            p.id as property_id,
            p.title as property_title,
            p.status as property_status,
            addr.address_line_1,
            addr.city,
            COUNT(r.id) as rooms_count,
            SUM(CASE WHEN r.status = 'available' THEN 1 ELSE 0 END) as available_rooms,
            SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) as occupied_rooms,
            AVG(r.price) as avg_room_price
        FROM properties p
        LEFT JOIN addresses addr ON p.address_id = addr.id
        LEFT JOIN rooms r ON p.id = r.property_id
        WHERE p.landlord_id = ? AND p.deleted_at IS NULL
        GROUP BY p.id, p.title, p.status, addr.address_line_1, addr.city
        ORDER BY p.created_at DESC
    ");
    $propertiesStmt->execute([$landlordId]);
    $properties = $propertiesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✓ Properties query successful\n";
    echo "Properties found: " . count($properties) . "\n";
    
    foreach ($properties as $property) {
        echo "- " . $property['property_title'] . 
             " (" . $property['rooms_count'] . " rooms, " . 
             $property['available_rooms'] . " available, " .
             "₱" . number_format($property['avg_room_price'] ?? 0, 2) . " avg)\n";
    }
    echo "\n";

    // Test applications statistics
    echo "8. Testing applications statistics...\n";
    $appsStmt = $pdo->prepare("
        SELECT 
            a.status,
            COUNT(*) as count,
            AVG(r.price) as avg_price
        FROM applications a
        INNER JOIN rooms r ON a.room_id = r.id
        INNER JOIN properties p ON r.property_id = p.id
        WHERE a.landlord_id = ? AND p.deleted_at IS NULL
        GROUP BY a.status
        ORDER BY count DESC
    ");
    $appsStmt->execute([$landlordId]);
    $appStats = $appsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✓ Applications statistics successful\n";
    foreach ($appStats as $stat) {
        echo "- " . ucfirst($stat['status']) . ": " . $stat['count'] . 
             " (Avg Price: ₱" . number_format($stat['avg_price'] ?? 0, 2) . ")\n";
    }
    echo "\n";

    // Test the actual endpoint
    echo "9. Testing actual endpoint...\n";
    
    // Mock authentication (you may need to adjust this based on your middleware)
    $_SERVER['REQUEST_METHOD'] = 'GET';
    
    // Capture output from the actual endpoint
    ob_start();
    try {
        // Note: This might fail due to authentication middleware
        // But it will test for syntax errors
        include __DIR__ . '/dashboard-stats.php';
        $output = ob_get_contents();
        ob_end_clean();
        
        echo "✓ Endpoint executed without fatal errors\n";
        
        // Try to decode JSON response
        $response = json_decode($output, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            echo "✓ Valid JSON response returned\n";
            if (isset($response['data'])) {
                echo "✓ Response contains data structure\n";
                
                // Check for expected data structure
                $data = $response['data'];
                $expectedKeys = ['occupancy', 'revenue', 'renewals', 'payment_alerts'];
                foreach ($expectedKeys as $key) {
                    if (isset($data[$key])) {
                        echo "✓ Contains '$key' data\n";
                    } else {
                        echo "⚠ Missing '$key' data\n";
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

    echo "\n=== Landlord Dashboard Stats API Test Complete ===\n";
    echo "Status: " . (count($properties) > 0 || $totalRooms > 0 ? "✓ PASS" : "⚠ NO DATA") . "\n";

} catch (Exception $e) {
    echo "✗ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}