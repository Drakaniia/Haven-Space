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

// Check if we're being included from main.php (Appwrite function context)
// If not, this is standalone execution via the PHP dev server
if (!defined('APPWRITE_FUNCTION_CONTEXT')) {
    require_once __DIR__ . '/../../cors.php';
    require_once __DIR__ . '/../../../src/Core/bootstrap.php';
}

use App\Core\Auth\GoogleOAuth;

// Validate action parameter
// In Appwrite function context, parameters come from original request data
if (defined('APPWRITE_FUNCTION_CONTEXT') && isset($GLOBALS['originalRequestData'])) {
    $action = $GLOBALS['originalRequestData']['action'] ?? $_GET['action'] ?? 'login';
    $role = $GLOBALS['originalRequestData']['role'] ?? $_GET['role'] ?? null;
} else {
    $action = $_GET['action'] ?? 'login';
    $role = $_GET['role'] ?? null;
}

$validActions = ['login', 'signup', 'link'];

if (!in_array($action, $validActions)) {
    if (defined('APPWRITE_FUNCTION_CONTEXT')) {
        // In Appwrite context, we'll let the caller handle the error
        $authUrl = null;
    } else {
        http_response_code(400);
        exit('Invalid action parameter');
    }
} else {
    // Store action in session for callback to use
    $_SESSION['oauth_action'] = $action;

    // Store role preference if provided (for signup flow)
    if ($role && in_array($role, ['boarder', 'landlord'])) {
        $_SESSION['oauth_role_preference'] = $role;
    }

    // Generate state token for CSRF protection
    $state = GoogleOAuth::generateState();
    $_SESSION['oauth_state'] = $state;

    // Generate authorization URL
    $authUrl = GoogleOAuth::getAuthorizationUrl($state);
    
    if (defined('APPWRITE_FUNCTION_CONTEXT')) {
        // In Appwrite context, just set the variable for the caller to use
        // Don't redirect or exit
    } else {
        // Standalone execution - redirect user to Google's OAuth consent screen
        header('Location: ' . $authUrl);
        exit;
    }
}
