<?php
/**
 * Run room management migration
 */

require_once __DIR__ . '/../server/src/Core/Database/Connection.php';

use App\Core\Database\Connection;

try {
    $pdo = Connection::getInstance()->getPdo();
    
    echo "Running room management migration...\n";
    
    // Read and execute the migration
    $migrationFile = __DIR__ . '/../server/database/migrations/018_add_room_management_columns.sql';
    $sql = file_get_contents($migrationFile);
    
    // Split by semicolon and execute each statement
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    foreach ($statements as $statement) {
        if (!empty($statement) && !str_starts_with(trim($statement), '--')) {
            echo "Executing: " . substr($statement, 0, 50) . "...\n";
            $pdo->exec($statement);
        }
    }
    
    echo "Migration completed successfully!\n";
    
    // Verify the new columns exist
    echo "\nVerifying room table structure:\n";
    $stmt = $pdo->prepare("DESCRIBE rooms");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $column) {
        echo "- {$column['Field']} ({$column['Type']})\n";
    }
    
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>