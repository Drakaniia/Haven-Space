<?php
/**
 * Test script to verify superadmin login functionality
 * This script tests the login endpoint with the superadmin credentials from AGENTS.md
 */

require_once __DIR__ . '/functions/api/auth/login.php';

// Set up the environment for testing
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';

// Create test data with superadmin credentials from AGENTS.md
$testData = [
    'email' => 'admin@mail.com',
    'password' => 'Superadmin123'
];

// Mock php://input
$mockInput = json_encode($testData);
file_put_contents('php://input', $mockInput);

// Capture the output
ob_start();
try {
    // Include the login script
    include __DIR__ . '/functions/api/auth/login.php';
    $response = ob_get_contents();
} catch (Exception $e) {
    $response = 'Error: ' . $e->getMessage();
} finally {
    ob_end_clean();
}

echo "=== Superadmin Login Test ===\n\n";
echo "Test Credentials:\n";
echo "Email: admin@mail.com\n";
echo "Password: Superadmin123\n\n";
echo "Response:\n";
echo $response . "\n\n";

// Try to decode the response
$decoded = json_decode($response, true);
if (json_last_error() === JSON_ERROR_NONE) {
    echo "Decoded Response:\n";
    print_r($decoded);
    
    if (isset($decoded['success']) && $decoded['success']) {
        echo "\n✓ Login successful!\n";
        echo "User ID: " . $decoded['user']['id'] . "\n";
        echo "Role: " . $decoded['user']['role'] . "\n";
    } elseif (isset($decoded['error'])) {
        echo "\n✗ Login failed: " . $decoded['error'] . "\n";
    }
} else {
    echo "✗ Invalid JSON response or error occurred\n";
}

echo "\n=== Test Complete ===\n";
