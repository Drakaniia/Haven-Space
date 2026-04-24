<?php
/**
 * Check current environment status
 * 
 * Usage: php scripts/env-status.php
 */

require_once __DIR__ . '/../config/app.php';

echo "=== Haven Space Environment Status ===\n\n";

echo "Environment: " . env('APP_ENV', 'unknown') . "\n";
echo "Debug Mode: " . (env('APP_DEBUG', false) ? 'ON' : 'OFF') . "\n";
echo "Base URL: " . env('APP_BASE_URL', 'not set') . "\n\n";

echo "=== Database Configuration ===\n";
echo "Host: " . env('DB_HOST', 'not set') . "\n";
echo "Port: " . env('DB_PORT', 'not set') . "\n";
echo "Database: " . env('DB_NAME', 'not set') . "\n";
echo "Username: " . env('DB_USER', 'not set') . "\n";
echo "Password: " . (env('DB_PASS', '') ? '[SET]' : '[EMPTY]') . "\n\n";

echo "=== Appwrite Configuration ===\n";
echo "Endpoint: " . env('APPWRITE_ENDPOINT', 'not set') . "\n";
echo "Project ID: " . env('APPWRITE_PROJECT_ID', 'not set') . "\n";
echo "Database ID: " . env('APPWRITE_DATABASE_ID', 'not set') . "\n";
echo "API Key: " . (env('APPWRITE_API_KEY', '') ? '[SET]' : '[NOT SET]') . "\n\n";

// Test database connection
echo "=== Database Connection Test ===\n";

// Test unified database system
try {
    require_once __DIR__ . '/../config/database.php';
    $db = getUnifiedDB();
    $dbType = \App\Core\Database\DatabaseManager::getDatabaseType();
    
    echo "Active Database Type: " . strtoupper($dbType) . "\n";
    
    if ($dbType === 'mysql') {
        $mysqlAdapter = $db;
        if (method_exists($mysqlAdapter, 'getPdo')) {
            $pdo = $mysqlAdapter->getPdo();
            $stmt = $pdo->query("SELECT 1");
            echo "✓ MySQL Connection: SUCCESS\n";
        }
    } else {
        $appwriteAdapter = $db;
        if (method_exists($appwriteAdapter, 'getDatabases')) {
            $databases = $appwriteAdapter->getDatabases();
            $databaseId = $appwriteAdapter->getDatabaseId();
            $collections = $databases->listCollections($databaseId);
            echo "✓ Appwrite Connection: SUCCESS\n";
            echo "  Collections Found: " . count($collections['collections']) . "\n";
        }
    }
} catch (Exception $e) {
    echo "✗ Unified Database: FAILED - " . $e->getMessage() . "\n";
}

// Test legacy connections for comparison
echo "\n=== Legacy Connection Tests ===\n";
try {
    $db = getDB();
    echo "✓ MySQL (Legacy): SUCCESS\n";
} catch (Exception $e) {
    echo "✗ MySQL (Legacy): FAILED - " . $e->getMessage() . "\n";
}

try {
    $appwriteDB = getAppwriteDB();
    echo "✓ Appwrite (Legacy): SUCCESS\n";
} catch (Exception $e) {
    echo "✗ Appwrite (Legacy): FAILED - " . $e->getMessage() . "\n";
}

echo "\n=== Recommendations ===\n";
if (env('APP_ENV') === 'local') {
    echo "• You're in LOCAL mode - using XAMPP MySQL\n";
    echo "• Make sure XAMPP is running\n";
    echo "• Database: " . env('DB_NAME', 'havenspace_db') . "\n";
    echo "• All API calls will use MySQL database\n";
} elseif (env('APP_ENV') === 'production') {
    echo "• You're in PRODUCTION mode - using Appwrite Database\n";
    echo "• Make sure Appwrite credentials are correct\n";
    echo "• All API calls will use Appwrite database\n";
    echo "• Ensure collections exist in Appwrite for all MySQL tables\n";
} else {
    echo "• Unknown environment - check your APP_ENV setting\n";
}

echo "\n=== Environment Switching ===\n";
echo "• Change APP_ENV in .env file to switch databases\n";
echo "• APP_ENV=local → MySQL (XAMPP)\n";
echo "• APP_ENV=production → Appwrite Cloud\n";
echo "• Test endpoint: /api/test-environment.php\n";
?>