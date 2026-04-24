<?php

namespace App\Core\Database;

use PDO;
use Appwrite\Client;
use Appwrite\Services\Databases;

/**
 * Database Manager
 * 
 * Handles environment-specific database connections
 * - Local: MySQL via PDO
 * - Production: Appwrite Database
 */
class DatabaseManager
{
    private static $mysqlConnection = null;
    private static $appwriteConnection = null;
    private static $unifiedAdapter = null;

    /**
     * Get MySQL connection (always available)
     * @return PDO
     */
    public static function getMySQLConnection(): PDO
    {
        if (self::$mysqlConnection === null) {
            require_once __DIR__ . '/../../../config/app.php';
            
            $host = env('DB_HOST', '127.0.0.1');
            $port = env('DB_PORT', 3306);
            $database = env('DB_NAME', 'havenspace_db');
            $username = env('DB_USER', 'root');
            $password = env('DB_PASS', '');
            $charset = 'utf8mb4';
            
            $dsn = "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            self::$mysqlConnection = new PDO($dsn, $username, $password, $options);
        }
        
        return self::$mysqlConnection;
    }

    /**
     * Get Appwrite database connection
     * @return Databases
     */
    public static function getAppwriteConnection(): Databases
    {
        if (self::$appwriteConnection === null) {
            require_once __DIR__ . '/../../../config/app.php';
            
            $client = new Client();
            $client
                ->setEndpoint(env('APPWRITE_ENDPOINT'))
                ->setProject(env('APPWRITE_PROJECT_ID'))
                ->setKey(env('APPWRITE_API_KEY'));
            
            self::$appwriteConnection = new Databases($client);
        }
        
        return self::$appwriteConnection;
    }

    /**
     * Get unified database adapter based on environment
     * @return DatabaseInterface
     */
    public static function getAdapter(): DatabaseInterface
    {
        if (self::$unifiedAdapter === null) {
            require_once __DIR__ . '/../../../config/app.php';
            
            if (self::isProduction()) {
                $appwriteDb = self::getAppwriteConnection();
                $databaseId = env('APPWRITE_DATABASE_ID');
                self::$unifiedAdapter = new AppwriteAdapter($appwriteDb, $databaseId);
            } else {
                $mysqlPdo = self::getMySQLConnection();
                self::$unifiedAdapter = new MySQLAdapter($mysqlPdo);
            }
        }
        
        return self::$unifiedAdapter;
    }

    /**
     * Get primary database connection based on environment
     * @return PDO|Databases
     */
    public static function getPrimaryConnection()
    {
        require_once __DIR__ . '/../../../config/app.php';
        
        if (self::isProduction()) {
            return self::getAppwriteConnection();
        } else {
            return self::getMySQLConnection();
        }
    }

    /**
     * Get database type based on environment
     * @return string 'mysql' or 'appwrite'
     */
    public static function getDatabaseType(): string
    {
        require_once __DIR__ . '/../../../config/app.php';
        return self::isProduction() ? 'appwrite' : 'mysql';
    }

    /**
     * Check if we're in production environment
     * @return bool
     */
    public static function isProduction(): bool
    {
        require_once __DIR__ . '/../../../config/app.php';
        return env('APP_ENV', 'local') === 'production';
    }
}