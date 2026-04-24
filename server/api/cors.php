<?php

/**
 * ENVIRONMENT-AWARE CORS CONFIGURATION
 *
 * Loads allowed origins from .env file and handles cross-origin requests
 * between frontend and backend across different environments.
 *
 * Local Development: http://localhost:3000, http://localhost:8000
 * Production: https://yourdomain.com
 */

// Load environment variables
require_once __DIR__ . '/../config/app.php';

// 1. Get allowed origins from environment variable (comma-separated)
$allowedOriginsStr = env('ALLOWED_ORIGINS', 'http://localhost:3000');
$allowed_origins = array_map('trim', explode(',', $allowedOriginsStr));

// Add default localhost origins if not already present
$defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost',
    'http://127.0.0.1'
];
$allowed_origins = array_unique(array_merge($allowed_origins, $defaultOrigins));

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Remove any existing CORS headers to avoid duplicates
header_remove('Access-Control-Allow-Origin');
header_remove('Access-Control-Allow-Methods');
header_remove('Access-Control-Allow-Headers');
header_remove('Access-Control-Allow-Credentials');

// Normalize origin for comparison (remove port for localhost)
$normalizedOrigin = $origin;
if (strpos($origin, 'http://localhost:') === 0) {
    $normalizedOrigin = 'http://localhost';
}

// Allow requests without Origin header (direct browser navigation)
// This is needed for OAuth authorize endpoints that redirect the browser
// Also allow localhost with any port for development
if ($origin === '' || in_array($origin, $allowed_origins) || $normalizedOrigin === 'http://localhost') {
    if ($origin !== '') {
        header("Access-Control-Allow-Origin: $origin");
    }
} else {
    // Log unauthorized origin in debug mode
    if (isDebugMode()) {
        error_log("CORS: Unauthorized origin attempt: $origin");
    }
    
    // Return 403 for unauthorized origin
    http_response_code(403);
    header('Content-Type: application/json');
    $body = json_encode([
        'error' => 'Unauthorized origin',
        'message' => isDebugMode() ? "Origin '$origin' is not allowed" : 'CORS policy violation'
    ]);
    echo $body;
    if (defined('APPWRITE_FUNCTION_CONTEXT')) {
        throw new ResponseSentException(403, $body);
    }
    exit;
}

// 3. Mandatory CORS Headers
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-User-Id');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400'); // Cache preflight for 1 day

// 4. Handle OPTIONS Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Some browsers require 200 or 204 for preflight
    http_response_code(200);
    if (defined('APPWRITE_FUNCTION_CONTEXT')) {
        throw new ResponseSentException(200, '');
    }
    exit;
}
