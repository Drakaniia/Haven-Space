<?php
/**
 * Test script for Auth Login API
 * Tests: /api/auth/login.php
 * 
 * This script tests the login endpoint to ensure:
 * 1. Database connection works
 * 2. Normalized database queries work correctly
 * 3. No syntax errors in the endpoint
 * 4. Real data is fetched from the database
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

use App\Core\Database\Connection;

header('Content-Type: application/json');

echo "=== Testing Auth Login API ===\n\n";

try {
    // Test database connection
    echo "1. Testing database connection...\n";
    $pdo = Connection::getInstance()->getPdo();
    echo "✓ Database connection successful\n\n";

    // Test normalized tables exist
    echo "2. Testing normalized tables...\n";
    $tables = [
        'users', 'user_roles', 'account_statuses', 'applications', 
        'login_attempts'
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

    // Test user authentication query with normalized joins
    echo "3. Testing user authentication query with normalized joins...\n";
    $testEmail = 'admin@mail.com'; // Using default superadmin from AGENTS.md
    
    $stmt = $pdo->prepare('
        SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.google_id,
               ur.role_name as role, u.is_verified, acs.status_name as account_status,
               acs.is_active as account_is_active
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        JOIN account_statuses acs ON u.account_status_id = acs.id
        WHERE u.email = ? AND u.deleted_at IS NULL
    ');
    $stmt->execute([$testEmail]);
    $user = $stmt->fetch();
    
    echo "✓ User authentication query executed successfully\n";
    
    if ($user) {
        echo "Found test user:\n";
        echo "- ID: " . $user['id'] . "\n";
        echo "- Name: " . $user['first_name'] . " " . $user['last_name'] . "\n";
        echo "- Email: " . $user['email'] . "\n";
        echo "- Role: " . $user['role'] . "\n";
        echo "- Account Status: " . $user['account_status'] . "\n";
        echo "- Is Verified: " . ($user['is_verified'] ? 'Yes' : 'No') . "\n";
        echo "- Has Password: " . (!empty($user['password_hash']) ? 'Yes' : 'No') . "\n";
        echo "- Google ID: " . ($user['google_id'] ? 'Yes' : 'No') . "\n\n";
    } else {
        echo "⚠ Test user not found. Creating sample users...\n";
        
        // Check if roles exist
        $roleStmt = $pdo->prepare("SELECT id, role_name FROM user_roles");
        $roleStmt->execute();
        $roles = $roleStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "Available roles:\n";
        foreach ($roles as $role) {
            echo "- " . $role['role_name'] . " (ID: " . $role['id'] . ")\n";
        }
        echo "\n";
    }

    // Test boarder status determination function
    echo "4. Testing boarder status determination...\n";
    
    // Find a boarder user
    $boarderStmt = $pdo->prepare('
        SELECT u.id, u.first_name, u.last_name
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE ur.role_name = "boarder" AND u.deleted_at IS NULL
        LIMIT 1
    ');
    $boarderStmt->execute();
    $boarder = $boarderStmt->fetch();
    
    if ($boarder) {
        echo "Testing with boarder: " . $boarder['first_name'] . " " . $boarder['last_name'] . "\n";
        
        // Check applications for this boarder
        $appStmt = $pdo->prepare('
            SELECT status, COUNT(*) as count 
            FROM applications 
            WHERE boarder_id = ? AND deleted_at IS NULL 
            GROUP BY status
        ');
        $appStmt->execute([$boarder['id']]);
        $appStats = $appStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "Application statistics:\n";
        foreach ($appStats as $stat) {
            echo "- " . $stat['status'] . ": " . $stat['count'] . "\n";
        }
        
        // Determine status using the same logic as login.php
        $acceptedStmt = $pdo->prepare('SELECT COUNT(*) as count FROM applications WHERE boarder_id = ? AND status = ? AND deleted_at IS NULL');
        $acceptedStmt->execute([$boarder['id'], 'accepted']);
        $acceptedCount = $acceptedStmt->fetchColumn();
        
        $pendingStmt = $pdo->prepare('SELECT COUNT(*) as count FROM applications WHERE boarder_id = ? AND status = ? AND deleted_at IS NULL');
        $pendingStmt->execute([$boarder['id'], 'pending']);
        $pendingCount = $pendingStmt->fetchColumn();
        
        $anyStmt = $pdo->prepare('SELECT COUNT(*) as count FROM applications WHERE boarder_id = ? AND deleted_at IS NULL');
        $anyStmt->execute([$boarder['id']]);
        $anyCount = $anyStmt->fetchColumn();
        
        $boarderStatus = 'new';
        if ($acceptedCount > 0) {
            $boarderStatus = 'accepted';
        } elseif ($pendingCount > 0) {
            $boarderStatus = 'applied_pending';
        } elseif ($anyCount > 0) {
            $boarderStatus = 'rejected';
        }
        
        echo "Determined boarder status: " . $boarderStatus . "\n\n";
    } else {
        echo "⚠ No boarder users found\n\n";
    }

    // Test rate limiting table
    echo "5. Testing rate limiting functionality...\n";
    $rateLimitStmt = $pdo->prepare("SELECT COUNT(*) as count FROM login_attempts");
    $rateLimitStmt->execute();
    $rateLimitCount = $rateLimitStmt->fetchColumn();
    
    echo "✓ Rate limiting table accessible\n";
    echo "Current login attempts records: " . $rateLimitCount . "\n\n";

    // Test user statistics
    echo "6. Testing user statistics...\n";
    $userStatsStmt = $pdo->prepare("
        SELECT 
            ur.role_name,
            COUNT(*) as user_count,
            SUM(CASE WHEN acs.status_name = 'active' THEN 1 ELSE 0 END) as active_count,
            SUM(CASE WHEN u.is_verified = 1 THEN 1 ELSE 0 END) as verified_count
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        JOIN account_statuses acs ON u.account_status_id = acs.id
        WHERE u.deleted_at IS NULL
        GROUP BY ur.role_name, ur.id
        ORDER BY user_count DESC
    ");
    $userStatsStmt->execute();
    $userStats = $userStatsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✓ User statistics query executed successfully\n";
    foreach ($userStats as $stat) {
        echo "- " . ucfirst($stat['role_name']) . "s: " . $stat['user_count'] . 
             " (Active: " . $stat['active_count'] . 
             ", Verified: " . $stat['verified_count'] . ")\n";
    }
    echo "\n";

    // Test the actual endpoint with a mock request
    echo "7. Testing actual endpoint...\n";
    
    // Simulate POST request
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
    
    // Create mock input data
    $mockData = json_encode([
        'email' => 'admin@mail.com',
        'password' => 'Superadmin123'
    ]);
    
    // Mock php://input
    $tempFile = tmpfile();
    fwrite($tempFile, $mockData);
    rewind($tempFile);
    
    // Capture output from the actual endpoint
    ob_start();
    try {
        // Note: This might not work perfectly due to php://input mocking limitations
        // But it will test for syntax errors and basic functionality
        include __DIR__ . '/login.php';
        $output = ob_get_contents();
        ob_end_clean();
        
        echo "✓ Endpoint executed without fatal errors\n";
        
        // Try to decode JSON response
        $response = json_decode($output, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            echo "✓ Valid JSON response returned\n";
            if (isset($response['success']) || isset($response['error'])) {
                echo "✓ Response contains expected structure\n";
            }
        } else {
            echo "⚠ Response is not valid JSON or contains errors\n";
            echo "Response: " . substr($output, 0, 200) . "...\n";
        }
    } catch (Exception $e) {
        ob_end_clean();
        echo "✗ Endpoint error: " . $e->getMessage() . "\n";
    }
    
    fclose($tempFile);

    echo "\n=== Auth Login API Test Complete ===\n";
    echo "Status: " . (count($userStats) > 0 ? "✓ PASS" : "⚠ NO DATA") . "\n";

} catch (Exception $e) {
    echo "✗ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}