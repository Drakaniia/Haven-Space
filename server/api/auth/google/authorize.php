<?php
/**
 * Google OAuth Authorization Endpoint
 * 
 * Initiates the Google OAuth flow by redirecting the user to Google's consent screen.
 * 
 * Query Parameters:
 * - role (optional): 'boarder' or 'landlord' - stored in session for signup flow
 * - action (optional): 'login' (default) or 'signup' or 'link'
 */

require_once __DIR__ . '/../../cors.php';
require_once __DIR__ . '/../../../src/Core/bootstrap.php';

use App\Core\Auth\GoogleOAuth;

// Validate action parameter
$action = $_GET['action'] ?? 'login';
$validActions = ['login', 'signup', 'link'];

if (!in_array($action, $validActions)) {
    http_response_code(400);
    exit('Invalid action parameter');
}

// Store action in session for callback to use
$_SESSION['oauth_action'] = $action;

// Store role preference if provided (for signup flow)
if (isset($_GET['role']) && in_array($_GET['role'], ['boarder', 'landlord'])) {
    $_SESSION['oauth_role_preference'] = $_GET['role'];
}

// Generate state token for CSRF protection
$state = GoogleOAuth::generateState();
$_SESSION['oauth_state'] = $state;

// Generate authorization URL
$authUrl = GoogleOAuth::getAuthorizationUrl($state);

// Redirect user to Google's OAuth consent screen
header('Location: ' . $authUrl);
exit;
