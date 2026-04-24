<?php

namespace App\Core\Database;

use PDO;

/**
 * Database Facade
 * 
 * Provides a simple interface to database connections
 */
class Database
{
    private static $instance = null;
    private $connection;

    private function __construct()
    {
        $this->connection = Connection::getInstance();
    }

    /**
     * Get database instance
     * @return self
     */
    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get PDO connection
     * @return PDO
     */
    public function getConnection(): PDO
    {
        return $this->connection->getPdo();
    }

    /**
     * Magic method to proxy PDO methods
     */
    public function __call($name, $arguments)
    {
        return $this->getConnection()->$name(...$arguments);
    }
}