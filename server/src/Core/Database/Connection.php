<?php

namespace App\Core\Database;

use PDO;
use PDOException;

class Connection
{
    private static $instance = null;
    private $pdo;

    private function __construct()
    {
        $config = require __DIR__ . '/../../../config/database.php';
        
        // Build DSN with port if specified
        $port = isset($config['port']) && $config['port'] !== '3306' 
            ? ":{$config['port']}" 
            : '';
        
        $dsn = "mysql:host={$config['host']}{$port};dbname={$config['database']};charset={$config['charset']}";

        // Aiven and other cloud providers require SSL
        $sslOptions = [];
        if (isset($config['ssl_mode']) && $config['ssl_mode'] === 'REQUIRED') {
            $sslOptions = [
                PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
                PDO::MYSQL_ATTR_SSL_CA => $config['ssl_ca'] ?? null,
            ];
        }

        // Merge SSL options with existing PDO options
        $pdoOptions = array_merge($config['options'] ?? [], $sslOptions);

        try {
            $this->pdo = new PDO($dsn, $config['username'], $config['password'], $pdoOptions);
        } catch (PDOException $e) {
            throw new PDOException($e->getMessage(), (int)$e->getCode());
        }
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getPdo(): PDO
    {
        return $this->pdo;
    }
}
