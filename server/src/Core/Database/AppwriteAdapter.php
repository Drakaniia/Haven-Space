<?php

namespace App\Core\Database;

use Appwrite\Services\Databases;
use Appwrite\Query;

/**
 * Appwrite Database Adapter
 * 
 * Implements DatabaseInterface for Appwrite operations
 */
class AppwriteAdapter implements DatabaseInterface
{
    private Databases $databases;
    private string $databaseId;

    public function __construct(Databases $databases, string $databaseId)
    {
        $this->databases = $databases;
        $this->databaseId = $databaseId;
    }

    public function select(string $table, array $conditions = [], array $options = []): array
    {
        $queries = [];
        
        // Convert conditions to Appwrite queries
        foreach ($conditions as $field => $value) {
            if (is_array($value)) {
                // Handle IN conditions - Appwrite doesn't have direct IN, so we'll use multiple OR conditions
                foreach ($value as $v) {
                    $queries[] = Query::equal($field, $v);
                }
            } else {
                $queries[] = Query::equal($field, $value);
            }
        }
        
        // Handle limit and offset
        if (isset($options['limit'])) {
            $queries[] = Query::limit((int)$options['limit']);
        }
        
        if (isset($options['offset'])) {
            $queries[] = Query::offset((int)$options['offset']);
        }
        
        // Handle ordering
        if (isset($options['order'])) {
            // Parse MySQL-style ORDER BY (e.g., "created_at DESC")
            $orderParts = explode(' ', trim($options['order']));
            $field = $orderParts[0];
            $direction = isset($orderParts[1]) && strtoupper($orderParts[1]) === 'DESC' ? 'desc' : 'asc';
            
            if ($direction === 'desc') {
                $queries[] = Query::orderDesc($field);
            } else {
                $queries[] = Query::orderAsc($field);
            }
        }
        
        try {
            $result = $this->databases->listDocuments($this->databaseId, $table, $queries);
            return $result['documents'];
        } catch (\Exception $e) {
            error_log("Appwrite select error: " . $e->getMessage());
            throw new \Exception("Database select failed: " . $e->getMessage());
        }
    }

    public function insert(string $table, array $data)
    {
        try {
            // Generate a unique document ID
            $documentId = 'unique()';
            
            $result = $this->databases->createDocument(
                $this->databaseId,
                $table,
                $documentId,
                $data
            );
            
            return $result['$id'];
        } catch (\Exception $e) {
            error_log("Appwrite insert error: " . $e->getMessage());
            throw new \Exception("Database insert failed: " . $e->getMessage());
        }
    }

    public function update(string $table, array $data, array $conditions): int
    {
        try {
            // For Appwrite, we need to find documents first, then update them
            $documents = $this->select($table, $conditions);
            $updatedCount = 0;
            
            foreach ($documents as $document) {
                $this->databases->updateDocument(
                    $this->databaseId,
                    $table,
                    $document['$id'],
                    $data
                );
                $updatedCount++;
            }
            
            return $updatedCount;
        } catch (\Exception $e) {
            error_log("Appwrite update error: " . $e->getMessage());
            throw new \Exception("Database update failed: " . $e->getMessage());
        }
    }

    public function delete(string $table, array $conditions): int
    {
        try {
            // For Appwrite, we need to find documents first, then delete them
            $documents = $this->select($table, $conditions);
            $deletedCount = 0;
            
            foreach ($documents as $document) {
                $this->databases->deleteDocument(
                    $this->databaseId,
                    $table,
                    $document['$id']
                );
                $deletedCount++;
            }
            
            return $deletedCount;
        } catch (\Exception $e) {
            error_log("Appwrite delete error: " . $e->getMessage());
            throw new \Exception("Database delete failed: " . $e->getMessage());
        }
    }

    public function query(string $query, array $params = []): array
    {
        // Appwrite doesn't support raw SQL queries
        // This method is mainly for complex MySQL queries
        // For production, you'd need to convert these to Appwrite operations
        throw new \Exception("Raw queries not supported in Appwrite. Use specific methods instead.");
    }

    public function beginTransaction(): void
    {
        // Appwrite doesn't support transactions in the traditional sense
        // You might need to implement application-level transaction logic
    }

    public function commit(): void
    {
        // Appwrite doesn't support transactions
    }

    public function rollback(): void
    {
        // Appwrite doesn't support transactions
    }

    /**
     * Get the underlying Appwrite Databases service for complex operations
     */
    public function getDatabases(): Databases
    {
        return $this->databases;
    }

    /**
     * Get database ID
     */
    public function getDatabaseId(): string
    {
        return $this->databaseId;
    }
}