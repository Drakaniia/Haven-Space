<?php
/**
 * Google OAuth Link Endpoint
 * 
 * Initiates the Google OAuth flow for linking Google account to an existing user account.
 * Requires user to be authenticated (logged in) before linking.
 */

require_once __DIR__ . '/../../cors.php';
require_once __DIR__ . '/../../../src/Core/bootstrap.php';
require_once __DIR__ . '/../../../src/Core/Auth/Middleware.php';

use App\Core\Auth\GoogleOAuth;
use App\Core\Auth\Middleware;

// Verify user is authenticated
try {
    Middleware::ensureAuthenticated();
} catch (\Exception $e) {
    // User not authenticated, redirect to login with absolute path
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $baseUrl = $protocol . '://' . $host;
    header('Location: ' . $baseUrl . '/views/public/auth/login.html?error=Please%20login%20first%20to%20link%20Google%20account');
    exit;
}

// Store action as 'link' for callback to handle
$_SESSION['oauth_action'] = 'link';

// Generate state token for CSRF protection
$state = GoogleOAuth::generateState();
$_SESSION['oauth_state'] = $state;

// Generate authorization URL
$authUrl = GoogleOAuth::getAuthorizationUrl($state);

// Redirect user to Google's OAuth consent screen
header('Location: ' . $authUrl);
exit;
