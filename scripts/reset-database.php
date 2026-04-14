<?php
/**
 * Haven Space - Database Reset Script
 *
 * WARNING: This script will DELETE ALL data from the database except the default admin user.
 * Use with extreme caution!
 *
 * Usage: php scripts/reset-database.php [--force] [--no-backup]
 *
 * Options:
 *   --force      Skip confirmation prompt (use in automated environments)
 *   --no-backup  Skip creating a backup before resetting
 */

// Load environment variables
require_once __DIR__ . '/../server/config/app.php';

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
    echo PHP_EOL . Colors::BOLD . Colors::RED . "━━━ " . $message . " ━━━" . Colors::RESET . PHP_EOL;
}

// Parse command line arguments
$force = in_array('--force', $argv) || in_array('-f', $argv);
$noBackup = in_array('--no-backup', $argv);

// Get database configuration
$dbHost = env('DB_HOST', '127.0.0.1');
$dbPort = env('DB_PORT', '3306');
$dbName = env('DB_NAME', 'havenspace_db');
$dbUser = env('DB_USER', 'root');
$dbPass = env('DB_PASS', '');

section('⚠ HAVEN SPACE DATABASE RESET ⚠');

echo PHP_EOL;
warning('WARNING: This will DELETE ALL user data, properties, and related records!');
warning('Only the default admin user will be preserved.');
echo PHP_EOL;

info("Database: {$dbName}");
info("Host: {$dbHost}:{$dbPort}");
echo PHP_EOL;

// Confirm before proceeding
if (!$force) {
    echo "Are you sure you want to continue? (type 'YES' to confirm): ";
    $handle = fopen("php://stdin", "r");
    $confirmation = trim(fgets($handle));
    fclose($handle);

    if ($confirmation !== 'YES') {
        error('Database reset cancelled.');
        exit(0);
    }
}

// Step 1: Connect to database
section('Step 1: Connecting to Database');

try {
    $pdo = new PDO(
        "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    success('Connected to database successfully');
} catch (PDOException $e) {
    error('Failed to connect to database');
    error($e->getMessage());
    exit(1);
}

// Step 2: Create backup (unless --no-backup)
if (!$noBackup) {
    section('Step 2: Creating Backup');

    $backupDir = __DIR__ . '/../backups';
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0755, true);
    }

    $timestamp = date('Y-m-d_H-i-s');
    $backupFile = "{$backupDir}/db_backup_{$timestamp}.sql";

    try {
        // Use mysqldump if available
        $mysqldumpPath = 'mysqldump';
        $command = "{$mysqldumpPath} --host={$dbHost} --port={$dbPort} --user={$dbUser}";
        if ($dbPass) {
            $command .= " --password={$dbPass}";
        }
        $command .= " --routines --triggers --single-transaction {$dbName} > \"{$backupFile}\"";

        $output = [];
        $returnCode = 0;
        exec($command . ' 2>&1', $output, $returnCode);

        if ($returnCode === 0 && file_exists($backupFile)) {
            $backupSize = round(filesize($backupFile) / 1024, 2);
            success("Backup created: {$backupFile} ({$backupSize} KB)");
        } else {
            warning('Failed to create backup via mysqldump, skipping backup');
            if (!empty($output)) {
                warning(implode("\n", $output));
            }
        }
    } catch (Exception $e) {
        warning('Backup creation failed, continuing without backup');
        warning($e->getMessage());
    }
}

// Step 3: Disable foreign key checks
section('Step 3: Disabling Constraints');

try {
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    success('Foreign key checks disabled');
} catch (PDOException $e) {
    error('Failed to disable foreign key checks');
    error($e->getMessage());
    exit(1);
}

// Step 4: Truncate all tables
section('Step 4: Truncating Tables');

// Define tables to truncate in order (respecting dependencies)
$tablesToTruncate = [
    'signup_sessions',
    'landlord_verification_log',
    'property_reports',
    'disputes',
    'applications',
    'rooms',
    'payment_methods',
    'property_locations',
    'landlord_profiles',
    'properties',
    'login_attempts',
    'platform_settings',
];

$deletedCounts = [];

foreach ($tablesToTruncate as $table) {
    try {
        // Check if table exists
        $exists = $pdo->query("SHOW TABLES LIKE '{$table}'")->fetch();
        if (!$exists) {
            info("Table '{$table}' does not exist, skipping");
            continue;
        }

        // Get row count before truncating
        $count = $pdo->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();

        // Truncate the table
        $pdo->exec("TRUNCATE TABLE {$table}");
        $deletedCounts[$table] = $count;
        success("Truncated '{$table}' ({$count} rows deleted)");
    } catch (PDOException $e) {
        error("Failed to truncate '{$table}'");
        error($e->getMessage());
    }
}

// Step 5: Delete all users except default admin
section('Step 5: Deleting User Accounts');

try {
    // Get count of users to delete
    $userCount = $pdo->query("SELECT COUNT(*) FROM users WHERE email != 'admin@mail.com'")->fetchColumn();

    // Delete all users except the default admin
    $pdo->exec("DELETE FROM users WHERE email != 'admin@mail.com'");
    success("Deleted {$userCount} user account(s)");
} catch (PDOException $e) {
    error('Failed to delete users');
    error($e->getMessage());
}

// Step 6: Re-enable foreign key checks
section('Step 6: Re-enabling Constraints');

try {
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    success('Foreign key checks re-enabled');
} catch (PDOException $e) {
    error('Failed to re-enable foreign key checks');
    error($e->getMessage());
    exit(1);
}

// Step 7: Reset platform settings to defaults
section('Step 7: Resetting Platform Settings');

try {
    $pdo->exec("INSERT IGNORE INTO platform_settings (setting_key, setting_value) VALUES
        ('maintenance_message', ''),
        ('terms_version', '1.0'),
        ('privacy_version', '1.0'),
        ('notify_admin_new_landlord', '1'),
        ('platform_fee_percent', '0')");
    success('Platform settings reset to defaults');
} catch (PDOException $e) {
    warning('Failed to reset platform settings (may already be set)');
}

// Summary
section('🗑 DATABASE RESET COMPLETE 🗑');

echo PHP_EOL;
warning('Summary of deleted data:');
foreach ($deletedCounts as $table => $count) {
    if ($count > 0) {
        echo "  • {$table}: {$count} row(s)" . PHP_EOL;
    }
}
echo PHP_EOL;

success('Database has been reset successfully!');
info("Database: {$dbName}");
info("Host: {$dbHost}:{$dbPort}");

echo PHP_EOL;
echo 'Next steps:' . PHP_EOL;
echo '  • Run seeders: php scripts/setup-database.php --seed' . PHP_EOL;
echo '  • Start the server: npm run server' . PHP_EOL;
echo PHP_EOL;

exit(0);
