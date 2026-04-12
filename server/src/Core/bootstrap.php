<?php

require_once __DIR__ . '/Env.php';
\App\Core\Env::load(__DIR__ . '/../../.env');

// Configure session before starting
if (session_status() === PHP_SESSION_NONE) {
    // Session cookie should be available across all paths
    ini_set('session.cookie_path', '/');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_strict_mode', '1');
    
    // For local development, disable secure cookie (HTTP)
    ini_set('session.cookie_secure', '0');
    ini_set('session.cookie_samesite', 'Lax');
    
    session_start();
}

spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $base_dir = __DIR__ . '/../';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});
