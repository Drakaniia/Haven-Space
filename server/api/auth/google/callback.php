<?php
/**
 * Google OAuth Callback Endpoint
 * 
 * Handles the callback from Google after user authentication.
 * - Validates state parameter (CSRF protection)
 * - Exchanges authorization code for tokens
 * - Fetches user profile from Google
 * - Creates or updates user account
 * - Generates JWT tokens
 * - Redirects to appropriate dashboard
 */

require_once __DIR__ . '/../../cors.php';
require_once __DIR__ . '/../../../src/Core/bootstrap.php';

use App\Core\Auth\GoogleOAuth;
use App\Core\Auth\JWT;
use App\Core\Database\Connection;

// Dynamically determine the base URL for redirects
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$port = $_SERVER['SERVER_PORT'] ?? '80';

// Detect server environment
$isBuiltInServer = ($port === '8000');
$isApache = (stripos($_SERVER['SERVER_SOFTWARE'] ?? '', 'Apache') !== false);

// Load APP_BASE_URL from environment if available
$config = require __DIR__ . '/../../../config/app.php';
$appBaseUrl = $config['app_base_url'] ?? null;

if ($appBaseUrl) {
    // Use configured base URL from .env
    $baseUrl = rtrim($appBaseUrl, '/');
} else if ($isBuiltInServer) {
    // PHP built-in server on port 8000 serves both API and frontend via router.php
    // Use the same port for both frontend and API
    $cleanHost = strpos($host, ':') !== false ? explode(':', $host)[0] : $host;
    $baseUrl = $protocol . '://' . $cleanHost . ':8000';
} else {
    // Apache or other servers - use current host
    // Remove port 80/443 from URL as they're default
    $cleanHost = $host;
    if (strpos($host, ':') !== false) {
        $parts = explode(':', $host);
        $portNum = $parts[1];
        // Keep port in URL if it's not standard (not 80 for HTTP, not 443 for HTTPS)
        if (($protocol === 'http' && $portNum !== '80') || 
            ($protocol === 'https' && $portNum !== '443')) {
            $cleanHost = $host; // Keep the port
        } else {
            $cleanHost = $parts[0]; // Remove standard port
        }
    }
    $baseUrl = $protocol . '://' . $cleanHost;
}

// Helper function to build redirect URLs
function buildRedirectUrl($baseUrl, $path)
{
    // Ensure path starts with /
    if (strpos($path, '/') !== 0) {
        $path = '/' . $path;
    }
    return $baseUrl . $path;
}

// Check for OAuth error from Google
if (isset($_GET['error'])) {
    $errorMessage = $_GET['error_description'] ?? $_GET['error'] ?? 'Google authentication failed';
    error_log('Google OAuth error: ' . $errorMessage);

    // Redirect to login with error
    $redirectUrl = buildRedirectUrl($baseUrl, '/client/views/public/auth/login.html?error=' . urlencode($errorMessage));
    header('Location: ' . $redirectUrl);
    exit;
}

// Verify authorization code is present
$code = $_GET['code'] ?? null;
if (!$code) {
    error_log('Google OAuth callback: No authorization code received');
    header('Location: ' . buildRedirectUrl($baseUrl, '/client/views/public/auth/login.html?error=No%20authorization%20code%20received'));
    exit;
}

// Verify state parameter (CSRF protection)
$state = $_GET['state'] ?? null;
$storedState = $_SESSION['oauth_state'] ?? null;

if (!$state || !$storedState || $state !== $storedState) {
    error_log('Google OAuth callback: Invalid state parameter - possible CSRF attack');
    error_log('State from Google: ' . substr($state ?? '', 0, 20) . '...');
    error_log('State from session: ' . substr($storedState ?? '', 0, 20) . '...');
    header('Location: ' . buildRedirectUrl($baseUrl, '/client/views/public/auth/login.html?error=Invalid%20state%20parameter'));
    exit;
}

// Clear used state
unset($_SESSION['oauth_state']);

// Get action and role preference from session
$action = $_SESSION['oauth_action'] ?? 'login';
$rolePreference = $_SESSION['oauth_role_preference'] ?? null;

try {
    // Exchange authorization code for tokens
    $tokenData = GoogleOAuth::exchangeCodeForToken($code);

    $accessToken = $tokenData['access_token'];
    $refreshToken = $tokenData['refresh_token'] ?? null;
    $idToken = $tokenData['id_token'] ?? null;

    // Fetch user profile from Google
    $googleUser = GoogleOAuth::getUserInfo($accessToken);

    // Extract user information
    $googleId = $googleUser['sub'] ?? null;
    $email = $googleUser['email'] ?? null;
    $firstName = $googleUser['given_name'] ?? null;
    $lastName = $googleUser['family_name'] ?? null;
    $avatarUrl = $googleUser['picture'] ?? null;
    $emailVerified = $googleUser['email_verified'] ?? false;

    if (!$googleId || !$email) {
        throw new \Exception('Invalid user data from Google');
    }

    // Connect to database
    $pdo = Connection::getInstance()->getPdo();
    $config = require __DIR__ . '/../../../config/app.php';

    // Check if user exists by Google ID
    $stmt = $pdo->prepare('SELECT id, first_name, last_name, email, role, is_verified, account_status FROM users WHERE google_id = ?');
    $stmt->execute([$googleId]);
    $user = $stmt->fetch();

    // If no user found by Google ID, check by email
    if (!$user) {
        $stmt = $pdo->prepare('SELECT id, first_name, last_name, email, role, password_hash, is_verified, account_status FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // User exists with this email but not linked to Google
        if ($user) {
            if ($action === 'link') {
                // This is a link action - link Google to existing account
                $stmt = $pdo->prepare('UPDATE users SET google_id = ?, google_token = ?, google_refresh_token = ?, avatar_url = ?, is_verified = ? WHERE id = ?');
                $stmt->execute([$googleId, $accessToken, $refreshToken, $avatarUrl, $emailVerified ? true : $user['is_verified'], $user['id']]);

                $userId = $user['id'];
                $userRole = $user['role'];
            } else {
                // Ask user to login with existing method first
                header('Location: ' . buildRedirectUrl($baseUrl, '/client/views/public/auth/login.html?error=Email%20already%20registered.%20Please%20login%20with%20your%20existing%20account%20and%20link%20Google%20from%20your%20profile.'));
                exit;
            }
        } else {
            // New user - create account
            // For new users, we need to determine role
            // If role preference exists, use it; otherwise, redirect to signup for role selection
            if (!$rolePreference) {
                // Store Google data in session for the frontend to pick up
                $_SESSION['pending_google_user'] = [
                    'google_id' => $googleId,
                    'email' => $email,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'avatar_url' => $avatarUrl,
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'email_verified' => $emailVerified,
                    'came_from_login' => $action === 'login', // Track if user came from login
                ];

                // Redirect to signup page for role selection
                // If came from login, show step 1 (role selection), otherwise show step 2
                $oauthParam = $action === 'login' ? 'oauth=new' : 'oauth=pending';
                header('Location: ' . buildRedirectUrl($baseUrl, '/client/views/public/auth/signup.html?' . $oauthParam));
                exit;
            }

            // Create new user account
            $stmt = $pdo->prepare('
                INSERT INTO users (first_name, last_name, email, google_id, google_token, google_refresh_token, avatar_url, role, is_verified, country) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');

            $stmt->execute([
                $firstName,
                $lastName,
                $email,
                $googleId,
                $accessToken,
                $refreshToken,
                $avatarUrl,
                $rolePreference,
                $emailVerified ? 1 : 0,
                null, // Country will be added later by user
            ]);

            $userId = $pdo->lastInsertId();
            $userRole = $rolePreference;
        }
    } else {
        // Existing Google user - update tokens and info
        $stmt = $pdo->prepare('UPDATE users SET google_token = ?, google_refresh_token = ?, avatar_url = ?, first_name = ?, last_name = ? WHERE id = ?');
        $stmt->execute([$accessToken, $refreshToken, $avatarUrl, $firstName, $lastName, $user['id']]);

        $userId = $user['id'];
        $userRole = $user['role'];
    }

    // Fetch verification and account status for the user
    $stmtVerified = $pdo->prepare('SELECT is_verified, account_status FROM users WHERE id = ?');
    $stmtVerified->execute([$userId]);
    $verifiedRow = $stmtVerified->fetch();
    $isVerified = $verifiedRow ? (bool) $verifiedRow['is_verified'] : false;
    $accountStatus = $verifiedRow['account_status'] ?? 'active';

    if ($accountStatus !== 'active') {
        header('Location: ' . buildRedirectUrl($baseUrl, '/client/views/public/auth/login.html?error=' . urlencode('Your account is not active. Contact support.')));
        exit;
    }

    // Generate JWT tokens
    $payload = [
        'user_id' => $userId,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'email' => $email,
        'role' => $userRole,
        'is_verified' => $isVerified,
        'account_status' => $accountStatus,
        'google_id' => $googleId,
    ];

    $jwtAccessToken = JWT::generate($payload, $config['jwt_expiration']);
    $jwtRefreshToken = JWT::generate($payload, $config['refresh_token_expiration']);

    // Set cookies
    setcookie('access_token', $jwtAccessToken, [
        'expires' => time() + $config['jwt_expiration'],
        'path' => '/',
        'domain' => '',
        'secure' => false, // Set to true in production with HTTPS
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    setcookie('refresh_token', $jwtRefreshToken, [
        'expires' => time() + $config['refresh_token_expiration'],
        'path' => '/',
        'domain' => '',
        'secure' => false, // Set to true in production with HTTPS
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    // Store user info in session for immediate access
    $_SESSION['user'] = [
        'id' => $userId,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'email' => $email,
        'role' => $userRole,
    ];

    // Clear any pending data
    unset($_SESSION['pending_google_user']);
    unset($_SESSION['oauth_action']);
    unset($_SESSION['oauth_role_preference']);

    // Redirect to appropriate dashboard
    // Build full absolute URL to prevent redirect loops
    if ($userRole === 'admin') {
        $redirectPath = '/client/views/admin/index.html';
    } else if ($userRole === 'landlord') {
        $redirectPath = '/client/views/landlord/index.html';
    } else {
        // Boarder - use routing logic based on status
        // For now, redirect to find-a-room (default for new/boarders)
        $redirectPath = '/client/views/public/find-a-room.html';
    }

    // Ensure we're using the correct base URL
    $finalRedirectUrl = buildRedirectUrl($baseUrl, $redirectPath);
    
    // Log for debugging
    error_log('Google OAuth - Base URL: ' . $baseUrl);
    error_log('Google OAuth - Redirect path: ' . $redirectPath);
    error_log('Google OAuth - Final redirect URL: ' . $finalRedirectUrl);
    
    header('Location: ' . $finalRedirectUrl);
    exit;

} catch (\Exception $e) {
    error_log('Google OAuth callback error: ' . $e->getMessage());

    // Clear session data on error
    unset($_SESSION['oauth_state']);
    unset($_SESSION['oauth_action']);
    unset($_SESSION['oauth_role_preference']);
    unset($_SESSION['pending_google_user']);

    // Redirect to login with error
    $errorMessage = urlencode('Google authentication failed: ' . $e->getMessage());
    header('Location: ' . buildRedirectUrl($baseUrl, '/client/views/public/auth/login.html?error=' . $errorMessage));
    exit;
}
