<?php
// Haven Space Application Configuration
// Loads environment variables and provides app-wide settings

/**
 * Load environment variables from .env file
 * Checks for environment-specific .env files:
 * - .env.{APP_ENV} (e.g., .env.local, .env.production)
 * - .env (default)
 */
function loadEnv($basePath)
{
    $envFile = $basePath . '/.env';
    $envLocalFile = $basePath . '/.env.local';
    
    // Priority: .env.local > .env
    // This allows overriding for local development
    if (file_exists($envLocalFile)) {
        $envFile = $envLocalFile;
    }
    
    if (!file_exists($envFile)) {
        // Fallback to .env.example if no .env exists
        $envExample = $basePath . '/.env.example';
        if (file_exists($envExample)) {
            error_log('Warning: .env file not found. Using .env.example as fallback.');
            $envFile = $envExample;
        } else {
            error_log('Warning: Neither .env nor .env.example found.');
            return;
        }
    }
    
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parse key=value
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Remove surrounding quotes
            $value = trim($value, '"\'');
            
            // Set environment variable if not already set
            if (!isset($_ENV[$key]) && !getenv($key)) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }
    }
}

/**
 * Get environment value with default fallback
 */
function env($key, $default = null)
{
    $value = $_ENV[$key] ?? getenv($key);
    if ($value === false || $value === null || $value === '') {
        return $default;
    }
    
    // Handle boolean strings
    if (strtolower($value) === 'true') {
        return true;
    }
    if (strtolower($value) === 'false') {
        return false;
    }
    
    return $value;
}

/**
 * Get current application environment
 * @return string 'local' or 'production'
 */
function getAppEnv()
{
    return env('APP_ENV', 'local');
}

/**
 * Check if application is in debug mode
 * @return bool
 */
function isDebugMode()
{
    return (bool) env('APP_DEBUG', false);
}

/**
 * Check if application is in production
 * @return bool
 */
function isProduction()
{
    return getAppEnv() === 'production';
}

// Auto-load environment on file inclusion
$serverBasePath = dirname(__DIR__);
loadEnv($serverBasePath);

return [
    'app_name' => 'Haven Space',
    'app_env' => getAppEnv(),
    'debug' => isDebugMode(),
    'jwt_secret' => env('JWT_SECRET', 'your_jwt_secret_key_here'),
    'jwt_expiration' => (int) env('JWT_EXPIRATION', 3600),
    'refresh_token_expiration' => (int) env('REFRESH_TOKEN_EXPIRATION', 604800),
    'api_prefix' => '/api',
];
