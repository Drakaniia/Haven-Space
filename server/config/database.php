<?php
// Haven Space Database Configuration
// Supports environment-specific database settings

// Load environment helper functions
require_once __DIR__ . '/app.php';

return [
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', 3306),
    'database' => env('DB_NAME', 'havenspace_db'),
    'username' => env('DB_USER', 'root'),
    'password' => env('DB_PASS', ''),
    'charset' => 'utf8mb4',
    'ssl_mode' => env('DB_SSL_MODE', null),
    'ssl_ca' => env('DB_SSL_CA', null),
    'options' => [
        PDO::ATTR_ERRMODE => isDebugMode() ? PDO::ERRMODE_EXCEPTION : PDO::ERRMODE_SILENT,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ],
];
