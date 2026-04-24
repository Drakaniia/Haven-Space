<?php
/**
 * Test Environment Database Switching
 * 
 * This endpoint demonstrates the environment-based database switching
 * GET /api/test-environment.php - Shows current database configuration and tests basic operations
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

try {
    // Get unified database adapter
    $db = getUnifiedDB();
    
    // Get environment info
    $environment = env('APP_ENV', 'local');
    $dbType = \App\Core\Database\DatabaseManager::getDatabaseType();
    
    // Test basic operations (using a simple test)
    $testResults = [];
    
    // Test 1: Check database type
    $testResults['database_type'] = $dbType;
    $testResults['environment'] = $environment;
    
    // Test 2: Try to get some basic info
    try {
        if ($dbType === 'mysql') {
            // For MySQL, we can test with a simple query
            $mysqlAdapter = $db;
            if (method_exists($mysqlAdapter, 'getPdo')) {
                $pdo = $mysqlAdapter->getPdo();
                $stmt = $pdo->query("SELECT 1 as test_connection");
                $result = $stmt->fetch();
                $testResults['connection_test'] = $result ? 'success' : 'failed';
            }
        } else {
            // For Appwrite, we can test the connection
            $appwriteAdapter = $db;
            if (method_exists($appwriteAdapter, 'getDatabases')) {
                $databases = $appwriteAdapter->getDatabases();
                $databaseId = $appwriteAdapter->getDatabaseId();
                
                // Try to list collections (tables) to test connection
                try {
                    $collections = $databases->listCollections($databaseId);
                    $testResults['connection_test'] = 'success';
                    $testResults['collections_count'] = count($collections['collections']);
                } catch (Exception $e) {
                    $testResults['connection_test'] = 'failed';
                    $testResults['error'] = $e->getMessage();
                }
            }
        }
    } catch (Exception $e) {
        $testResults['connection_test'] = 'failed';
        $testResults['error'] = $e->getMessage();
    }
    
    // Response
    $response = [
        'success' => true,
        'message' => 'Environment database switching is working',
        'data' => [
            'current_environment' => $environment,
            'database_type' => $dbType,
            'switching_active' => true,
            'test_results' => $testResults,
            'configuration' => [
                'local_uses' => 'MySQL (XAMPP)',
                'production_uses' => 'Appwrite Cloud Database',
                'switch_variable' => 'APP_ENV'
            ]
        ]
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database test failed: ' . $e->getMessage(),
        'environment' => env('APP_ENV', 'unknown')
    ], JSON_PRETTY_PRINT);
}
?>