<?php
/**
 * Simple deployment script to switch between local and production environments
 * 
 * Usage:
 * php scripts/deploy.php local    - Switch to local environment
 * php scripts/deploy.php production - Switch to production environment
 */

if ($argc < 2) {
    echo "Usage: php scripts/deploy.php [local|production]\n";
    exit(1);
}

$environment = $argv[1];
$envFile = __DIR__ . '/../.env';

if (!file_exists($envFile)) {
    echo "Error: .env file not found at {$envFile}\n";
    exit(1);
}

// Read current .env file
$envContent = file_get_contents($envFile);

if ($environment === 'local') {
    echo "Switching to LOCAL environment...\n";
    
    // Set to local
    $envContent = preg_replace('/^APP_ENV=.*/m', 'APP_ENV=local', $envContent);
    $envContent = preg_replace('/^APP_DEBUG=.*/m', 'APP_DEBUG=true', $envContent);
    
    // Comment out production DB settings and uncomment local ones
    $envContent = preg_replace('/^# (DB_HOST=localhost)/m', '$1', $envContent);
    $envContent = preg_replace('/^# (DB_PORT=3306)/m', '$1', $envContent);
    $envContent = preg_replace('/^# (DB_NAME=havenspace_db)/m', '$1', $envContent);
    $envContent = preg_replace('/^# (DB_USER=root)/m', '$1', $envContent);
    $envContent = preg_replace('/^# (DB_PASS=)/m', '$1', $envContent);
    
    echo "✓ Switched to LOCAL environment\n";
    echo "✓ Database: MySQL (XAMPP) - All API calls will use MySQL\n";
    echo "✓ Debug mode enabled\n";
    
} elseif ($environment === 'production') {
    echo "Switching to PRODUCTION environment...\n";
    
    // Set to production
    $envContent = preg_replace('/^APP_ENV=.*/m', 'APP_ENV=production', $envContent);
    $envContent = preg_replace('/^APP_DEBUG=.*/m', 'APP_DEBUG=false', $envContent);
    
    echo "✓ Switched to PRODUCTION environment\n";
    echo "✓ Database: Appwrite Cloud - All API calls will use Appwrite\n";
    echo "✓ Debug mode disabled\n";
    echo "✓ Make sure Appwrite collections match MySQL table structure\n";
    
} else {
    echo "Error: Invalid environment '{$environment}'. Use 'local' or 'production'\n";
    exit(1);
}

// Write back to .env file
file_put_contents($envFile, $envContent);

echo "\nEnvironment switch complete!\n";
echo "Current APP_ENV: {$environment}\n";
echo "\nDatabase Switching Active:\n";
echo "- Local (APP_ENV=local): Uses MySQL via XAMPP\n";
echo "- Production (APP_ENV=production): Uses Appwrite Cloud Database\n";
echo "\nDon't forget to:\n";
echo "- Test database connection: php scripts/env-status.php\n";
echo "- Test API endpoint: /api/test-environment.php\n";
echo "- Restart your web server\n";
echo "- Verify all API endpoints work correctly\n";
?>