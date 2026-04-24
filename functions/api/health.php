<?php
/**
 * Health Check Endpoint
 *
 * Returns server status and configuration info
 * Useful for monitoring and deployment verification
 */

// Include centralized CORS configuration
require_once __DIR__ . '/cors.php';

header('Content-Type: application/json');

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed'
    ]);
    exit();
}

// Load environment file
$envFile = dirname(__DIR__) . '/.env';
$envVars = [];

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        // Parse key=value
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $envVars[trim($key)] = trim($value, ' "\'');
        }
    }
}

// Check database connection
$dbStatus = 'unknown';
$dbMessage = '';

try {
    $pdo = new PDO(
        "mysql:host={$envVars['DB_HOST']};dbname={$envVars['DB_NAME']};charset=utf8mb4",
        $envVars['DB_USER'],
        $envVars['DB_PASS'] ?? '',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $dbStatus = 'connected';
    $dbMessage = 'Database connection successful';
} catch (PDOException $e) {
    $dbStatus = 'disconnected';
    $dbMessage = 'Database connection failed: ' . $e->getMessage();
}

// Check required extensions
$requiredExtensions = ['pdo', 'pdo_mysql', 'json', 'mbstring'];
$missingExtensions = [];

foreach ($requiredExtensions as $ext) {
    if (!extension_loaded($ext)) {
        $missingExtensions[] = $ext;
    }
}

// Build response
$response = [
    'success' => true,
    'data' => [
        'status' => empty($missingExtensions) && $dbStatus === 'connected' ? 'healthy' : 'degraded',
        'timestamp' => date('c'),
        'server' => [
            'php_version' => phpversion(),
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'extensions' => $requiredExtensions,
            'missing_extensions' => $missingExtensions
        ],
        'database' => [
            'status' => $dbStatus,
            'message' => $dbMessage,
            'host' => $envVars['DB_HOST'] ?? 'unknown',
            'database' => $envVars['DB_NAME'] ?? 'unknown'
        ],
        'environment' => [
            'app_env' => $envVars['APP_ENV'] ?? 'unknown',
            'app_debug' => ($envVars['APP_DEBUG'] ?? 'false') === 'true'
        ]
    ]
];

http_response_code(200);
echo json_encode($response);
