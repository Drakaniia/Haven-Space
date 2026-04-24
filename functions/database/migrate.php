#!/usr/bin/env php
<?php
/**
 * Database Migration Runner
 * Usage: php server/database/migrate.php
 */

require_once __DIR__ . '/../config/app.php';

$host = env('DB_HOST', '127.0.0.1');
$port = env('DB_PORT', 3306);
$dbname = env('DB_NAME', 'havenspace_db');
$username = env('DB_USER', 'root');
$password = env('DB_PASS', '');

$dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    echo "Connected to database: $dbname\n";

    // Create migrations tracking table if it doesn't exist
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) UNIQUE NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");

    // Get list of migration files
    $migrationsDir = __DIR__ . DIRECTORY_SEPARATOR . 'migrations';
    if (!is_dir($migrationsDir)) {
        echo "Migrations directory not found: $migrationsDir\n";
        exit(1);
    }
    
    $migrationFiles = array_filter(scandir($migrationsDir), function($file) {
        return preg_match('/^\d+.*\.sql$/', $file);
    });

    sort($migrationFiles);

    // Get already applied migrations
    $stmt = $pdo->query("SELECT filename FROM schema_migrations");
    $appliedMigrations = array_column($stmt->fetchAll(), 'filename');

    $pendingMigrations = array_diff($migrationFiles, $appliedMigrations);

    if (empty($pendingMigrations)) {
        echo "No pending migrations.\n";
        exit(0);
    }

    echo "Found " . count($pendingMigrations) . " pending migration(s):\n";

    foreach ($pendingMigrations as $file) {
        echo "\nApplying migration: $file\n";
        $filePath = $migrationsDir . DIRECTORY_SEPARATOR . $file;
        $sql = file_get_contents($filePath);

        // Execute multiple statements
        $pdo->exec($sql);

        // Record migration
        $stmt = $pdo->prepare("INSERT INTO schema_migrations (filename) VALUES (?)");
        $stmt->execute([$file]);

        echo "✓ Migration applied: $file\n";
    }

    echo "\n✓ All migrations applied successfully!\n";

} catch (PDOException $e) {
    echo "✗ Database error: " . $e->getMessage() . "\n";
    exit(1);
}
