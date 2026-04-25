<?php
/**
 * Test script for Admin Applications API
 * Tests: /api/admin/applications.php
 * 
 * This script tests the admin applications endpoint to ensure:
 * 1. Database connection works
 * 2. Normalized database queries work correctly
 * 3. No syntax errors in the endpoint
 * 4. Real data is fetched from the database
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

use App\Core\Database\Connection;

header('Content-Type: application/json');

echo "=== Testing Admin Applications API ===\n\n";

try {
    // Test database connection
    echo "1. Testing database connection...\n";
    $pdo = Connection::getInstance()->getPdo();
    echo "✓ Database connection successful\n\n";

    // Test normalized tables exist
    echo "2. Testing normalized tables...\n";
    $tables = [
        'users', 'user_roles', 'account_statuses', 'applications', 
        'properties', 'addresses', 'rooms', 'landlord_profiles'
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

    // Test applications query with normalized joins
    echo "3. Testing applications query with normalized joins...\n";
    $stmt = $pdo->prepare("
        SELECT 
            a.id,
            a.status,
            a.message,
            a.created_at,
            a.updated_at,
            -- Boarder info (normalized)
            u_boarder.id as boarder_id,
            u_boarder.first_name as boarder_first_name,
            u_boarder.last_name as boarder_last_name,
            u_boarder.email as boarder_email,
            ur_boarder.role_name as boarder_role,
            -- Landlord info (normalized)
            u_landlord.id as landlord_id,
            u_landlord.first_name as landlord_first_name,
            u_landlord.last_name as landlord_last_name,
            u_landlord.email as landlord_email,
            lp.boarding_house_name,
            -- Property info (normalized with address)
            p.id as property_id,
            p.title as property_title,
            addr.address_line_1,
            addr.city,
            addr.province,
            -- Room info
            r.id as room_id,
            r.title as room_title,
            r.price as room_price
        FROM applications a
        -- Boarder joins (normalized)
        LEFT JOIN users u_boarder ON a.boarder_id = u_boarder.id
        LEFT JOIN user_roles ur_boarder ON u_boarder.role_id = ur_boarder.id
        -- Landlord joins (normalized)
        LEFT JOIN users u_landlord ON a.landlord_id = u_landlord.id
        LEFT JOIN landlord_profiles lp ON u_landlord.id = lp.user_id
        -- Property joins (normalized with address)
        LEFT JOIN properties p ON a.property_id = p.id
        LEFT JOIN addresses addr ON p.address_id = addr.id
        -- Room joins
        LEFT JOIN rooms r ON a.room_id = r.id
        WHERE a.deleted_at IS NULL
        ORDER BY a.created_at DESC
        LIMIT 10
    ");
    
    $stmt->execute();
    $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✓ Applications query executed successfully\n";
    echo "Found " . count($applications) . " applications\n\n";

    // Display sample data
    if (!empty($applications)) {
        echo "4. Sample application data:\n";
        $sample = $applications[0];
        echo "Application ID: " . $sample['id'] . "\n";
        echo "Status: " . $sample['status'] . "\n";
        echo "Boarder: " . $sample['boarder_first_name'] . " " . $sample['boarder_last_name'] . "\n";
        echo "Landlord: " . $sample['landlord_first_name'] . " " . $sample['landlord_last_name'] . "\n";
        echo "Property: " . $sample['property_title'] . "\n";
        echo "Address: " . $sample['address_line_1'] . ", " . $sample['city'] . "\n";
        echo "Room: " . $sample['room_title'] . " (₱" . number_format($sample['room_price'], 2) . ")\n";
        echo "Created: " . $sample['created_at'] . "\n\n";
    } else {
        echo "4. No applications found in database\n\n";
    }

    // Test application statistics
    echo "5. Testing application statistics...\n";
    $statsStmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_applications,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
        FROM applications 
        WHERE deleted_at IS NULL
    ");
    $statsStmt->execute();
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    echo "✓ Statistics query executed successfully\n";
    echo "Total Applications: " . $stats['total_applications'] . "\n";
    echo "Pending: " . $stats['pending_count'] . "\n";
    echo "Approved: " . $stats['approved_count'] . "\n";
    echo "Rejected: " . $stats['rejected_count'] . "\n\n";

    // Test the actual endpoint
    echo "6. Testing actual endpoint...\n";
    
    // Simulate admin authentication (you may need to adjust this)
    $_SERVER['REQUEST_METHOD'] = 'GET';
    
    // Capture output from the actual endpoint
    ob_start();
    try {
        include __DIR__ . '/applications.php';
        $output = ob_get_contents();
        ob_end_clean();
        
        echo "✓ Endpoint executed without fatal errors\n";
        
        // Try to decode JSON response
        $response = json_decode($output, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            echo "✓ Valid JSON response returned\n";
            if (isset($response['data'])) {
                echo "✓ Response contains data structure\n";
            }
        } else {
            echo "⚠ Response is not valid JSON or contains errors\n";
            echo "Response: " . substr($output, 0, 200) . "...\n";
        }
    } catch (Exception $e) {
        ob_end_clean();
        echo "✗ Endpoint error: " . $e->getMessage() . "\n";
    }

    echo "\n=== Admin Applications API Test Complete ===\n";
    echo "Status: " . (count($applications) > 0 ? "✓ PASS" : "⚠ NO DATA") . "\n";

} catch (Exception $e) {
    echo "✗ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}