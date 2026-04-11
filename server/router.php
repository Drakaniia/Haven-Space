<?php
/**
 * Unified Router for Frontend + API
 * Serves static files from client/ directory
 * Routes API requests to api/ directory
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// API routes - forward to api directory
if (strpos($uri, '/auth/') === 0 || strpos($uri, '/api/') === 0) {
    // Forward API requests to the api directory
    $apiFile = __DIR__ . '/api' . $uri;

    if (file_exists($apiFile)) {
        require $apiFile;
        exit;
    }

    // Try index.php for directory requests
    $apiIndex = $apiFile . '/index.php';
    if (file_exists($apiIndex)) {
        require $apiIndex;
        exit;
    }

    // Fallback to routes.php for API routing
    $routesFile = __DIR__ . '/api/routes.php';
    if (file_exists($routesFile)) {
        require $routesFile;
        exit;
    }

    http_response_code(404);
    echo json_encode(['error' => 'API endpoint not found']);
    exit;
}

// Static file serving from client directory
$staticFile = __DIR__ . '/../client' . $uri;

// Check if file exists
if (file_exists($staticFile) && is_file($staticFile)) {
    $ext = pathinfo($staticFile, PATHINFO_EXTENSION);
    $mimeTypes = [
        'html' => 'text/html',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'eot' => 'application/vnd.ms-fontobject',
    ];

    if (isset($mimeTypes[$ext])) {
        header('Content-Type: ' . $mimeTypes[$ext]);
    }

    readfile($staticFile);
    exit;
}

// Default to index.html for SPA routing
$indexPath = __DIR__ . '/../client/index.html';
if (file_exists($indexPath)) {
    header('Content-Type: text/html');
    readfile($indexPath);
    exit;
}

http_response_code(404);
echo 'Not found';
