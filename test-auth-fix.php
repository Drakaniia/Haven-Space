<?php
/**
 * Test script to verify authentication fix
 * This script simulates the API call to check if authentication headers are properly handled
 */

// Simulate the API endpoint that was failing
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-Id');

// Check if this is a preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check for Authorization header
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? null;

if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Unauthorized',
        'message' => 'Missing or invalid Authorization header',
        'received_headers' => array_keys($headers)
    ]);
    exit();
}

// If we get here, authentication header is present
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Authentication header received successfully',
    'auth_header_present' => true,
    'token_format_valid' => str_starts_with($authHeader, 'Bearer ')
]);
?>