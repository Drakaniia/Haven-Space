<?php

namespace App\Core\Database;

/**
 * Database Interface
 * 
 * Provides a unified interface for both MySQL and Appwrite database operations
 */
interface DatabaseInterface
{
    /**
     * Execute a SELECT query
     * @param string $table
     * @param array $conditions
     * @param array $options
     * @return array
     */
    public function select(string $table, array $conditions = [], array $options = []): array;

    /**
     * Insert a record
     * @param string $table
     * @param array $data
     * @return string|int Insert ID
     */
    public function insert(string $table, array $data);

    /**
     * Update records
     * @param string $table
     * @param array $data
     * @param array $conditions
     * @return int Number of affected rows
     */
    public function update(string $table, array $data, array $conditions): int;

    /**
     * Delete records
     * @param string $table
     * @param array $conditions
     * @return int Number of affected rows
     */
    public function delete(string $table, array $conditions): int;

    /**
     * Execute raw query (for complex operations)
     * @param string $query
     * @param array $params
     * @return array
     */
    public function query(string $query, array $params = []): array;

    /**
     * Begin transaction
     */
    public function beginTransaction(): void;

    /**
     * Commit transaction
     */
    public function commit(): void;

    /**
     * Rollback transaction
     */
    public function rollback(): void;
}