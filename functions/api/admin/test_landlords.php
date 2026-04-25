<?php
/**
 * Test script for Admin Landlords API
 * Tests: /api/admin/landlords.php
 * 
 * This script tests the admin landlords endpoint to ensure:
 * 1. Database connection works
 * 2. Normalized database queries work correctly
 * 3. No syntax errors in the endpoint
 * 4. Real data is fetched from the database
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

use App\Core\Database\Connection;

header('Content-Type: application/json');

echo "=== Testing Admin Landlords API ===\n\n";

try {
    // Test database connection
    echo "1. Testing database connection...\n";
    $pdo = Connection::getInstance()->getPdo();
    echo "✓ Database connection successful\n\n";

    // Test normalized tables exist
    echo "2. Testing normalized tables...\n";
    $tables = [
        'users', 'user_roles', 'account_statuses', 'landlord_profiles', 
        'verification_records', 'verification_statuses', 'property_types',
        'files', 'addresses'
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

    // Test landlords query with normalized joins
    echo "3. Testing landlords query with normalized joins...\n";
    $stmt = $pdo->prepare("
        SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.phone_number,
            u.created_at,
            u.updated_at,
            -- Role info (normalized)
            ur.role_name,
            -- Account status (normalized)
            acs.status_name as account_status,
            acs.is_active as account_is_active,
            -- Landlord profile (normalized)
            lp.boarding_house_name,
            lp.boarding_house_description,
            lp.total_rooms,
            lp.available_rooms,
            -- Property type (normalized)
            pt.type_name as property_type,
            -- Avatar file (normalized)
            f.file_url as avatar_url,
            f.file_name as avatar_filename,
            -- Verification status (normalized)
            vr.id as verification_record_id,
            vs.status_name as verification_status,
            vr.submitted_at as verification_submitted_at,
            vr.reviewed_at as verification_reviewed_at,
            vr.notes as verification_notes
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        JOIN account_statuses acs ON u.account_status_id = acs.id
        LEFT JOIN landlord_profiles lp ON u.id = lp.user_id
        LEFT JOIN property_types pt ON lp.property_type_id = pt.id
        LEFT JOIN files f ON u.avatar_file_id = f.id AND f.deleted_at IS NULL
        LEFT JOIN verification_records vr ON vr.entity_type = 'user' AND vr.entity_id = u.id
        LEFT JOIN verification_statuses vs ON vr.verification_status_id = vs.id
        WHERE ur.role_name = 'landlord' 
            AND u.deleted_at IS NULL
        ORDER BY u.created_at DESC
        LIMIT 10
    ");
    
    $stmt->execute();
    $landlords = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✓ Landlords query executed successfully\n";
    echo "Found " . count($landlords) . " landlords\n\n";

    // Display sample data
    if (!empty($landlords)) {
        echo "4. Sample landlord data:\n";
        $sample = $landlords[0];
        echo "Landlord ID: " . $sample['id'] . "\n";
        echo "Name: " . $sample['first_name'] . " " . $sample['last_name'] . "\n";
        echo "Email: " . $sample['email'] . "\n";
        echo "Business Name: " . ($sample['boarding_house_name'] ?? 'N/A') . "\n";
        echo "Property Type: " . ($sample['property_type'] ?? 'N/A') . "\n";
        echo "Total Rooms: " . ($sample['total_rooms'] ?? 'N/A') . "\n";
        echo "Account Status: " . $sample['account_status'] . "\n";
        echo "Verification Status: " . ($sample['verification_status'] ?? 'Not submitted') . "\n";
        echo "Created: " . $sample['created_at'] . "\n\n";
    } else {
        echo "4. No landlords found in database\n\n";
    }

    // Test landlord statistics
    echo "5. Testing landlord statistics...\n";
    $statsStmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_landlords,
            SUM(CASE WHEN acs.status_name = 'active' THEN 1 ELSE 0 END) as active_count,
            SUM(CASE WHEN acs.status_name = 'pending_verification' THEN 1 ELSE 0 END) as pending_verification_count,
            SUM(CASE WHEN acs.status_name = 'suspended' THEN 1 ELSE 0 END) as suspended_count,
            SUM(CASE WHEN vs.status_name = 'approved' THEN 1 ELSE 0 END) as verified_count,
            SUM(CASE WHEN vs.status_name = 'pending' THEN 1 ELSE 0 END) as verification_pending_count
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        JOIN account_statuses acs ON u.account_status_id = acs.id
        LEFT JOIN verification_records vr ON vr.entity_type = 'user' AND vr.entity_id = u.id
        LEFT JOIN verification_statuses vs ON vr.verification_status_id = vs.id
        WHERE ur.role_name = 'landlord' 
            AND u.deleted_at IS NULL
    ");
    $statsStmt->execute();
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    echo "✓ Statistics query executed successfully\n";
    echo "Total Landlords: " . $stats['total_landlords'] . "\n";
    echo "Active: " . $stats['active_count'] . "\n";
    echo "Pending Verification: " . $stats['pending_verification_count'] . "\n";
    echo "Suspended: " . $stats['suspended_count'] . "\n";
    echo "Verified: " . ($stats['verified_count'] ?? 0) . "\n";
    echo "Verification Pending: " . ($stats['verification_pending_count'] ?? 0) . "\n\n";

    // Test properties count per landlord
    echo "6. Testing properties count per landlord...\n";
    $propertiesStmt = $pdo->prepare("
        SELECT 
            u.id as landlord_id,
            u.first_name,
            u.last_name,
            COUNT(p.id) as properties_count,
            SUM(CASE WHEN p.status = 'available' THEN 1 ELSE 0 END) as available_properties
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        LEFT JOIN properties p ON u.id = p.landlord_id AND p.deleted_at IS NULL
        WHERE ur.role_name = 'landlord' 
            AND u.deleted_at IS NULL
        GROUP BY u.id, u.first_name, u.last_name
        HAVING properties_count > 0
        ORDER BY properties_count DESC
        LIMIT 5
    ");
    $propertiesStmt->execute();
    $propertiesData = $propertiesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✓ Properties count query executed successfully\n";
    echo "Landlords with properties: " . count($propertiesData) . "\n";
    
    foreach ($propertiesData as $landlord) {
        echo "- " . $landlord['first_name'] . " " . $landlord['last_name'] . 
             ": " . $landlord['properties_count'] . " properties (" . 
             $landlord['available_properties'] . " available)\n";
    }
    echo "\n";

    // Test the actual endpoint
    echo "7. Testing actual endpoint...\n";
    
    // Simulate admin authentication (you may need to adjust this)
    $_SERVER['REQUEST_METHOD'] = 'GET';
    
    // Capture output from the actual endpoint
    ob_start();
    try {
        include __DIR__ . '/landlords.php';
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

    echo "\n=== Admin Landlords API Test Complete ===\n";
    echo "Status: " . (count($landlords) > 0 ? "✓ PASS" : "⚠ NO DATA") . "\n";

} catch (Exception $e) {
    echo "✗ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}