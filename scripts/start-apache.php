<?php
/**
 * Start XAMPP Apache service only.
 * Automatically opens the browser once Apache is running.
 * Press Ctrl+C to stop Apache.
 */

$xamppPath = 'C:\\xampp';
$apachePath = $xamppPath . '\\apache\\bin\\httpd.exe';
$apachePid = null;

// Function to check if a process is running
function isProcessRunning($processName)
{
    $output = [];
    exec("tasklist /FI \"IMAGENAME eq {$processName}\"", $output);
    foreach ($output as $line) {
        if (stripos($line, $processName) !== false) {
            return true;
        }
    }
    return false;
}

// Function to get PID of a process
function getProcessPid($processName)
{
    $output = [];
    exec("tasklist /FI \"IMAGENAME eq {$processName}\" /FO CSV /NH", $output);
    foreach ($output as $line) {
        if (stripos($line, $processName) !== false) {
            preg_match('/"(\d+)"/', $line, $matches);
            if (isset($matches[1])) {
                return $matches[1];
            }
        }
    }
    return null;
}

echo "Starting XAMPP Apache...\n\n";

// Check if Apache is already running
if (isProcessRunning(basename($apachePath))) {
    echo "✓ Apache is already running\n";
    $apachePid = getProcessPid(basename($apachePath));
} else {
    echo "Starting Apache...\n";

    $apacheConfig = $xamppPath . '\\apache\\conf\\httpd.conf';
    $command = 'start /B "" "' . $apachePath . '" -d "' . $xamppPath . '\\apache" -f "' . $apacheConfig . '"';

    // Run in background
    pclose(popen($command, 'r'));

    // Wait for Apache to start
    $retries = 0;
    $maxRetries = 20;
    while (!isProcessRunning(basename($apachePath)) && $retries < $maxRetries) {
        usleep(500000); // 0.5 seconds
        $retries++;
    }

    if (isProcessRunning(basename($apachePath))) {
        echo "✓ Apache started successfully\n";
        $apachePid = getProcessPid(basename($apachePath));
    } else {
        echo "✗ Failed to start Apache\n";
        exit(1);
    }
}

echo "\nApache is running! (PID: {$apachePid})\n";
echo "\nOpening browser...\n";

// Wait a moment for Apache to fully initialize
sleep(2);

// Check if PHP API server is running on port 8000
$apiRunning = false;
$connection = @fsockopen('localhost', 8000, $errno, $errstr, 1);
if (is_resource($connection)) {
    fclose($connection);
    $apiRunning = true;
}

// The frontend needs the API server on port 8000
// Open the homepage
$url = 'http://localhost/views/public/index.html';

// Detect OS and open browser accordingly
if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
    // Windows
    exec("start {$url}");
} elseif (PHP_OS === 'Darwin') {
    // macOS
    exec("open {$url}");
} else {
    // Linux
    exec("xdg-open {$url}");
}

echo "✓ Browser opened to {$url}\n";
echo "\n";

if (!$apiRunning) {
    echo "⚠️  WARNING: API server is NOT running on port 8000!\n";
    echo "   You need to run 'bun run server' in a SEPARATE terminal\n";
    echo "   \n";
    echo "   Without the API server:\n";
    echo "   - Login/Signup won't work\n";
    echo "   - Google OAuth will fail\n";
    echo "   - All database operations will fail\n";
    echo "   \n";
    echo "   Run this command in another terminal:\n";
    echo "   bun run server\n";
    echo "   \n";
} else {
    echo "✓ API server detected on port 8000\n";
    echo "   Frontend (Apache:80) → API (PHP:8000) ✓\n";
}
