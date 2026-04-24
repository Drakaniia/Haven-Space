<?php

/**
 * ENVIRONMENT-AWARE CORS CONFIGURATION
 *
 * Loads allowed origins from .env file and handles cross-origin requests
 * between frontend and backend across different environments.
 *
 * In Appwrite function context, header() calls are skipped since CORS headers
 * are set by main.php via $res->text(). Only origin validation is performed.
 */

// Load environment variables
require_once __DIR__ . '/../config/app.php';

// In Appwrite function context, CORS headers are handled by main.php — skip all header() calls
$isAppwriteContext = defined('APPWRITE_FUNCTION_CONTEXT');

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

if (!$isAppwriteContext) {
    // Remove any existing CORS headers to avoid duplicates
    header_remove('Access-Control-Allow-Origin');
    header_remove('Access-Control-Allow-Methods');
    header_remove('Access-Control-Allow-Headers');
    header_remove('Access-Control-Allow-Credentials');
}

// Normalize origin for comparison (remove port for localhost)
$normalizedOrigin = $origin;
if (strpos($origin, 'http://localhost:') === 0) {
    $normalizedOrigin = 'http://localhost';
}

// Allow requests without Origin header (direct browser navigation)
if ($origin === '' || in_array($origin, $allowed_origins) || $normalizedOrigin === 'http://localhost') {
    if ($origin !== '' && !$isAppwriteContext) {
        header("Access-Control-Allow-Origin: $origin");
    }
} else {
    // Log unauthorized origin in debug mode
    if (isDebugMode()) {
        error_log("CORS: Unauthorized origin attempt: $origin");
    }

    // Return 403 for unauthorized origin
    http_response_code(403);
    $body = json_encode([
        'error' => 'Unauthorized origin',
        'message' => isDebugMode() ? "Origin '$origin' is not allowed" : 'CORS policy violation',
    ]);
    echo $body;
    if ($isAppwriteContext) {
        throw new ResponseSentException(403, $body);
    }
    if (!$isAppwriteContext) {
        header('Content-Type: application/json');
    }
    exit;
}

if (!$isAppwriteContext) {
    // Mandatory CORS Headers
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-User-Id');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');

    // Handle OPTIONS Preflight
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}
