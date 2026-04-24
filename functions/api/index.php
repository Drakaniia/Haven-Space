<?php

/**
 * API Entry Point
 * Routes all API requests through the application
 */

// Enable error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Load bootstrap
require_once __DIR__ . '/../src/Core/bootstrap.php';

// Load CORS configuration
require_once __DIR__ . '/cors.php';

// Set content type
header('Content-Type: application/json');

// Load routes
require_once __DIR__ . '/routes.php';

// Routes will be dispatched automatically at the end of routes.php