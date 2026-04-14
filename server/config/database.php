<?php
// Haven Space Database Configuration
// Supports environment-specific database settings

// Load environment helper functions
require_once __DIR__ . '/app.php';

/**
 * Get database connection (PDO instance)
 * Creates and returns a singleton PDO connection
 * 
 * @return PDO Database connection
 */
function getDB() {
    static $pdo = null;
    
    if ($pdo === null) {
        $host = env('DB_HOST', '127.0.0.1');
        $port = env('DB_PORT', 3306);
        $database = env('DB_NAME', 'havenspace_db');
        $username = env('DB_USER', 'root');
        $password = env('DB_PASS', '');
        $charset = 'utf8mb4';
        
        $dsn = "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";
        
        $options = [
            PDO::ATTR_ERRMODE => isDebugMode() ? PDO::ERRMODE_EXCEPTION : PDO::ERRMODE_SILENT,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        
        // Add SSL options if configured
        $sslMode = env('DB_SSL_MODE', null);
        $sslCa = env('DB_SSL_CA', null);
        
        if (!empty($sslMode)) {
            $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = ($sslMode !== 'DISABLED');
        }
        if (!empty($sslCa)) {
            $options[PDO::MYSQL_ATTR_SSL_CA] = $sslCa;
        }
        
        try {
            $pdo = new PDO($dsn, $username, $password, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new PDOException("Database connection failed: " . $e->getMessage());
        }
    }
    
    return $pdo;
}

// Return config for backward compatibility (if needed)
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
