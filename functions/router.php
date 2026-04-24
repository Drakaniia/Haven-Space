<?php
/**
 * Unified Router for Frontend + API
 * Serves static files from client/ directory
 * Routes API requests to api/ directory
 */

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// API routes - forward to api directory
if (strpos($uri, '/auth/') === 0 || strpos($uri, '/api/') === 0 || strpos($uri, '/geocode/') === 0) {
    // /auth/* lives under server/api/auth/*; /api/* is served from server/api/* (strip /api prefix)
    // /geocode/* lives under server/api/geocode/*
    if (strpos($uri, '/api/') === 0) {
        $apiFile = __DIR__ . '/api/' . substr($uri, 5);
    } else {
        $apiFile = __DIR__ . '/api' . $uri;
    }

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

// Storage files - serve uploaded files from server/storage
if (strpos($uri, '/storage/') === 0) {
    $storageFile = __DIR__ . $uri;
    
    if (file_exists($storageFile) && is_file($storageFile)) {
        $ext = pathinfo($storageFile, PATHINFO_EXTENSION);
        $mimeTypes = [
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'webp' => 'image/webp',
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        
        if (isset($mimeTypes[$ext])) {
            header('Content-Type: ' . $mimeTypes[$ext]);
        }
        
        readfile($storageFile);
        exit;
    }
    
    http_response_code(404);
    echo 'Storage file not found';
    exit;
}

// Assets files - serve from client/assets directory
if (strpos($uri, '/assets/') === 0) {
    $assetFile = __DIR__ . '/../client' . $uri;
    
    if (file_exists($assetFile) && is_file($assetFile)) {
        $ext = pathinfo($assetFile, PATHINFO_EXTENSION);
        $mimeTypes = [
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'webp' => 'image/webp',
            'ico' => 'image/x-icon',
            'css' => 'text/css',
            'js' => 'application/javascript',
            'json' => 'application/json',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'eot' => 'application/vnd.ms-fontobject',
        ];
        
        if (isset($mimeTypes[$ext])) {
            header('Content-Type: ' . $mimeTypes[$ext]);
        }
        
        readfile($assetFile);
        exit;
    }
    
    http_response_code(404);
    echo 'Asset file not found';
    exit;
}

// Static file serving from client directory
// If URI already includes /client prefix, remove it to prevent duplication
$clientUri = $uri;
if (strpos($clientUri, '/client') === 0) {
    $clientUri = substr($clientUri, 7);
}
$staticFile = __DIR__ . '/../client' . $clientUri;

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
