<?php
// Haven Space Database Configuration
// Supports environment-specific database settings with single .env file

// Load environment helper functions
require_once __DIR__ . '/app.php';

/**
 * Get MySQL database connection
 * Uses the DB_* variables from .env file
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

/**
 * Get Appwrite database service (used for specific features)
 * @return \Appwrite\Services\Databases
 */
function getAppwriteDB() {
    static $appwriteDB = null;
    
    if ($appwriteDB === null) {
        require_once __DIR__ . '/../vendor/autoload.php';
        
        $client = new \Appwrite\Client();
        $client
            ->setEndpoint(env('APPWRITE_ENDPOINT'))
            ->setProject(env('APPWRITE_PROJECT_ID'))
            ->setKey(env('APPWRITE_API_KEY'));
        
        $appwriteDB = new \Appwrite\Services\Databases($client);
    }
    
    return $appwriteDB;
}



/**
 * Get unified database adapter (recommended for new code)
 * Automatically switches between MySQL and Appwrite based on environment
 * @return \App\Core\Database\DatabaseInterface
 */
function getUnifiedDB() {
    require_once __DIR__ . '/../src/Core/Database/DatabaseManager.php';
    require_once __DIR__ . '/../src/Core/Database/DatabaseInterface.php';
    require_once __DIR__ . '/../src/Core/Database/MySQLAdapter.php';
    require_once __DIR__ . '/../src/Core/Database/AppwriteAdapter.php';
    
    return \App\Core\Database\DatabaseManager::getAdapter();
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
