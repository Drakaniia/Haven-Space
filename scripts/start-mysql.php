<?php
/**
 * Start XAMPP MySQL service only.
 * Automatically opens phpMyAdmin in browser once MySQL is running.
 */

$xamppPath = 'C:\\xampp';
$mysqlPath = $xamppPath . '\\mysql\\bin\\mysqld.exe';
$mysqlBin = basename($mysqlPath);

echo "Starting XAMPP MySQL...\n\n";

// Check if MySQL is already running
$output = [];
exec("tasklist /FI \"IMAGENAME eq {$mysqlBin}\" 2>nul", $output);
$alreadyRunning = false;
foreach ($output as $line) {
    if (stripos($line, $mysqlBin) !== false) {
        $alreadyRunning = true;
        break;
    }
}

if ($alreadyRunning) {
    echo "⚠️  MySQL is already running\n";
} else {
    echo "Starting MySQL...\n";

    $mysqlConfig = $xamppPath . '\\mysql\\bin\\my.ini';
    $command = 'start /B "" "'.$mysqlPath.'" --defaults-file="'.$mysqlConfig.'"';

    // Run in background
    pclose(popen($command, 'r'));

    // Wait for MySQL to start
    $retries = 0;
    $maxRetries = 20;
    $started = false;
    while ($retries < $maxRetries) {
        $output = [];
        exec("tasklist /FI \"IMAGENAME eq {$mysqlBin}\" 2>nul", $output);
        foreach ($output as $line) {
            if (stripos($line, $mysqlBin) !== false) {
                $started = true;
                break 2;
            }
        }
        usleep(500000); // 0.5 seconds
        $retries++;
    }

    if ($started) {
        echo "✓ MySQL started successfully\n";
    } else {
        echo "✗ Failed to start MySQL\n";
        exit(1);
    }
}

echo "\nOpening phpMyAdmin...\n";

// Wait a moment for MySQL to fully initialize
usleep(500000); // 0.5 seconds

// Open phpMyAdmin in browser
exec('start http://localhost/phpmyadmin');
echo "✓ phpMyAdmin opened in browser\n";
