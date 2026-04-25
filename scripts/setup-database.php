<?php
/**
 * Haven Space - Database Setup Script
 * 
 * Automatically creates database and imports schema
 * Usage: php setup-database.php [--seed]
 * 
 * Options:
 *   --seed    Run seeders after schema import (optional)
 */

// Load environment variables
require_once __DIR__ . '/../functions/config/app.php';

// Colors for terminal output
class Colors
{
    const GREEN = "\033[32m";
    const RED = "\033[31m";
    const YELLOW = "\033[33m";
    const CYAN = "\033[36m";
    const BOLD = "\033[1m";
    const RESET = "\033[0m";
}

function info($message)
{
    echo Colors::CYAN . "ℹ " . Colors::RESET . $message . PHP_EOL;
}

function success($message)
{
    echo Colors::GREEN . "✓ " . Colors::RESET . $message . PHP_EOL;
}

function error($message)
{
    echo Colors::RED . "✗ " . Colors::RESET . Colors::RED . $message . Colors::RESET . PHP_EOL;
}

function warning($message)
{
    echo Colors::YELLOW . "⚠ " . Colors::RESET . $message . PHP_EOL;
}

function section($message)
{
    echo PHP_EOL . Colors::BOLD . Colors::CYAN . "━━━ " . $message . " ━━━" . Colors::RESET . PHP_EOL;
}

// Parse command line arguments
$runSeeders = in_array('--seed', $argv) || in_array('-s', $argv);

// Get database configuration
$dbHost = env('DB_HOST', '127.0.0.1');
$dbPort = env('DB_PORT', '3306');
$dbName = env('DB_NAME', 'havenspace_db');
$dbUser = env('DB_USER', 'root');
$dbPass = env('DB_PASS', '');

section('Haven Space Database Setup');

info("Database Host: {$dbHost}:{$dbPort}");
info("Database Name: {$dbName}");
info("Database User: {$dbUser}");
info("Run Seeders: " . ($runSeeders ? 'Yes' : 'No'));

// Step 1: Connect to MySQL (without database selection)
section('Step 1: Connecting to MySQL');

try {
    $pdo = new PDO(
        "mysql:host={$dbHost};port={$dbPort};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    success('Connected to MySQL successfully');
} catch (PDOException $e) {
    error('Failed to connect to MySQL');
    error($e->getMessage());
    echo PHP_EOL . 'Troubleshooting:' . PHP_EOL;
    echo '  1. Check if MySQL/MariaDB is running' . PHP_EOL;
    echo '  2. Verify database credentials in .env file' . PHP_EOL;
    echo '  3. Check if port ' . $dbPort . ' is correct' . PHP_EOL;
    exit(1);
}

// Step 2: Drop and recreate database to ensure clean setup
section('Step 2: Preparing Database');

try {
    // Drop database if it exists to ensure clean setup
    $pdo->exec("DROP DATABASE IF EXISTS `{$dbName}`");
    success("Dropped existing database (if existed)");
    
    // Create fresh database
    $pdo->exec("CREATE DATABASE `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    success("Database '{$dbName}' created");
} catch (PDOException $e) {
    error('Failed to prepare database');
    error($e->getMessage());
    exit(1);
}

// Step 3: Import schema
section('Step 3: Importing Schema');

$schemaFile = __DIR__ . '/../functions/database/schema.sql';

if (!file_exists($schemaFile)) {
    error("Schema file not found: {$schemaFile}");
    exit(1);
}

try {
    // Switch to the database
    $pdo->exec("USE `{$dbName}`");

    $schema = file_get_contents($schemaFile);
    if ($schema === false) {
        error('Failed to read schema file');
        exit(1);
    }

    // Execute schema SQL
    $pdo->exec($schema);
    success('Schema imported successfully');

    // Verify tables were created
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    info("Created " . count($tables) . " table(s): " . implode(', ', $tables));
} catch (PDOException $e) {
    error('Failed to import schema');
    error($e->getMessage());
    exit(1);
}

// Step 4: Run migrations (if any exist)
section('Step 4: Running Migrations');

$migrationsDir = __DIR__ . '/../functions/database/migrations';

if (!is_dir($migrationsDir)) {
    warning('Migrations directory not found, skipping');
} else {
    $migrationFiles = glob($migrationsDir . '/*.sql');
    sort($migrationFiles);

    if (empty($migrationFiles)) {
        info('No migration files found, skipping');
    } else {
        foreach ($migrationFiles as $migrationFile) {
            $migrationName = basename($migrationFile);
            try {
                $sql = file_get_contents($migrationFile);
                if ($sql === false) {
                    warning("Failed to read migration: {$migrationName}");
                    continue;
                }

                $pdo->exec($sql);
                success("Migration applied: {$migrationName}");
            } catch (PDOException $e) {
                warning("Migration failed: {$migrationName}");
                warning($e->getMessage());
            }
        }
    }
}

// Step 5: Run seeders (optional)
if ($runSeeders) {
    section('Step 5: Running Seeders');

    $seedersDir = __DIR__ . '/../functions/database/seeds';

    if (!is_dir($seedersDir)) {
        warning('Seeders directory not found, skipping');
    } else {
        $seederFiles = glob($seedersDir . '/*.php');
        sort($seederFiles);

        if (empty($seederFiles)) {
            info('No seeder files found, skipping');
        } else {
            foreach ($seederFiles as $seederFile) {
                $seederName = basename($seederFile);
                try {
                    // Execute seeder as subprocess to capture output
                    $output = [];
                    $returnCode = 0;
                    exec("php {$seederFile} 2>&1", $output, $returnCode);

                    if ($returnCode === 0) {
                        success("Seeder executed: {$seederName}");
                        // Show last few lines of output if any
                        if (!empty($output)) {
                            $lastLines = array_slice($output, -2);
                            foreach ($lastLines as $line) {
                                info("  " . trim($line));
                            }
                        }
                    } else {
                        warning("Seeder failed: {$seederName}");
                        warning(implode("\n", $output));
                    }
                } catch (Exception $e) {
                    warning("Seeder error: {$seederName}");
                    warning($e->getMessage());
                }
            }
        }
    }
}

// Summary
section('Setup Complete!');

success('Database is ready to use');
info("Database: {$dbName}");
info("Host: {$dbHost}:{$dbPort}");

echo PHP_EOL . 'Next steps:' . PHP_EOL;
echo '  • Start the server: php -S localhost:8000 -t api' . PHP_EOL;
echo '  • Run with seeders: php setup-database.php --seed' . PHP_EOL;
echo PHP_EOL;

exit(0);
