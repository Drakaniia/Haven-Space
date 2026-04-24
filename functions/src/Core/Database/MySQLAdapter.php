<?php

namespace App\Core\Database;

use PDO;
use PDOException;

/**
 * MySQL Database Adapter
 * 
 * Implements DatabaseInterface for MySQL operations
 */
class MySQLAdapter implements DatabaseInterface
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function select(string $table, array $conditions = [], array $options = []): array
    {
        $sql = "SELECT ";
        
        // Handle SELECT fields
        if (isset($options['fields'])) {
            $sql .= is_array($options['fields']) ? implode(', ', $options['fields']) : $options['fields'];
        } else {
            $sql .= "*";
        }
        
        $sql .= " FROM `{$table}`";
        
        // Handle WHERE conditions
        $params = [];
        if (!empty($conditions)) {
            $whereClause = [];
            foreach ($conditions as $field => $value) {
                if (is_array($value)) {
                    // Handle IN conditions
                    $placeholders = str_repeat('?,', count($value) - 1) . '?';
                    $whereClause[] = "`{$field}` IN ({$placeholders})";
                    $params = array_merge($params, $value);
                } else {
                    $whereClause[] = "`{$field}` = ?";
                    $params[] = $value;
                }
            }
            $sql .= " WHERE " . implode(' AND ', $whereClause);
        }
        
        // Handle ORDER BY
        if (isset($options['order'])) {
            $sql .= " ORDER BY " . $options['order'];
        }
        
        // Handle LIMIT
        if (isset($options['limit'])) {
            $sql .= " LIMIT " . (int)$options['limit'];
            if (isset($options['offset'])) {
                $sql .= " OFFSET " . (int)$options['offset'];
            }
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function insert(string $table, array $data)
    {
        $fields = array_keys($data);
        $placeholders = str_repeat('?,', count($fields) - 1) . '?';
        
        $sql = "INSERT INTO `{$table}` (`" . implode('`, `', $fields) . "`) VALUES ({$placeholders})";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_values($data));
        
        return $this->pdo->lastInsertId();
    }

    public function update(string $table, array $data, array $conditions): int
    {
        $setClause = [];
        $params = [];
        
        foreach ($data as $field => $value) {
            $setClause[] = "`{$field}` = ?";
            $params[] = $value;
        }
        
        $sql = "UPDATE `{$table}` SET " . implode(', ', $setClause);
        
        if (!empty($conditions)) {
            $whereClause = [];
            foreach ($conditions as $field => $value) {
                $whereClause[] = "`{$field}` = ?";
                $params[] = $value;
            }
            $sql .= " WHERE " . implode(' AND ', $whereClause);
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->rowCount();
    }

    public function delete(string $table, array $conditions): int
    {
        $sql = "DELETE FROM `{$table}`";
        $params = [];
        
        if (!empty($conditions)) {
            $whereClause = [];
            foreach ($conditions as $field => $value) {
                $whereClause[] = "`{$field}` = ?";
                $params[] = $value;
            }
            $sql .= " WHERE " . implode(' AND ', $whereClause);
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->rowCount();
    }

    public function query(string $query, array $params = []): array
    {
        $stmt = $this->pdo->prepare($query);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function beginTransaction(): void
    {
        $this->pdo->beginTransaction();
    }

    public function commit(): void
    {
        $this->pdo->commit();
    }

    public function rollback(): void
    {
        $this->pdo->rollBack();
    }

    /**
     * Get the underlying PDO connection for complex operations
     */
    public function getPdo(): PDO
    {
        return $this->pdo;
    }
}