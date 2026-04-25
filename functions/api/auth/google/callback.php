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

// Check if we're being included from main.php (Appwrite function context)
// If not, this is standalone execution via the PHP dev server
if (!defined('APPWRITE_FUNCTION_CONTEXT')) {
    require_once __DIR__ . '/../../cors.php';
    require_once __DIR__ . '/../../../src/Core/bootstrap.php';
}

use App\Core\Auth\GoogleOAuth;
use App\Core\Auth\JWT;
use App\Core\Database\Connection;

/**
 * Determine boarder status based on applications
 * 
 * @param \PDO $pdo Database connection
 * @param int $boarderId Boarder user ID
 * @return string Boarder status
 */
function determineBoarderStatus($pdo, $boarderId) {
    // Check for accepted applications
    $acceptedStmt = $pdo->prepare('SELECT COUNT(*) as count FROM applications WHERE boarder_id = ? AND status = ? AND deleted_at IS NULL');
    $acceptedStmt->execute([$boarderId, 'accepted']);
    $acceptedCount = $acceptedStmt->fetchColumn();
    
    if ($acceptedCount > 0) {
        return 'accepted';
    }
    
    // Check for pending applications
    $pendingStmt = $pdo->prepare('SELECT COUNT(*) as count FROM applications WHERE boarder_id = ? AND status = ? AND deleted_at IS NULL');
    $pendingStmt->execute([$boarderId, 'pending']);
    $pendingCount = $pendingStmt->fetchColumn();
    
    if ($pendingCount > 0) {
        return 'applied_pending';
    }
    
    // Check for any applications (rejected/cancelled)
    $anyStmt = $pdo->prepare('SELECT COUNT(*) as count FROM applications WHERE boarder_id = ? AND deleted_at IS NULL');
    $anyStmt->execute([$boarderId]);
    $anyCount = $anyStmt->fetchColumn();
    
    if ($anyCount > 0) {
        // Has applications but none are pending or accepted (likely rejected)
        return 'rejected';
    }
    
    // No applications at all
    return 'new';
}

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
    $redirectUrl = buildRedirectUrl($baseUrl, '/views/public/auth/login.html?error=' . urlencode($errorMessage));
    header('Location: ' . $redirectUrl);
    exit;
}

// Verify authorization code is present
$code = $_GET['code'] ?? null;
if (!$code) {
    error_log('Google OAuth callback: No authorization code received');
    header('Location: ' . buildRedirectUrl($baseUrl, '/views/public/auth/login.html?error=No%20authorization%20code%20received'));
    exit;
}

// Verify state parameter (CSRF protection)
$state = $_GET['state'] ?? null;
$storedState = $_SESSION['oauth_state'] ?? null;

if (!$state || !$storedState || $state !== $storedState) {
    error_log('Google OAuth callback: Invalid state parameter - possible CSRF attack');
    error_log('State from Google: ' . substr($state ?? '', 0, 20) . '...');
    error_log('State from session: ' . substr($storedState ?? '', 0, 20) . '...');
    header('Location: ' . buildRedirectUrl($baseUrl, '/views/public/auth/login.html?error=Invalid%20state%20parameter'));
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
    $stmt = $pdo->prepare('
        SELECT u.id, u.first_name, u.last_name, u.email, 
               ur.role_name as role, u.is_verified, acs.status_name as account_status
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        JOIN account_statuses acs ON u.account_status_id = acs.id
        WHERE u.google_id = ? AND u.deleted_at IS NULL
    ');
    $stmt->execute([$googleId]);
    $user = $stmt->fetch();

    // If no user found by Google ID, check by email
    if (!$user) {
        $stmt = $pdo->prepare('
            SELECT u.id, u.first_name, u.last_name, u.email, 
                   ur.role_name as role, u.password_hash, u.is_verified, acs.status_name as account_status
            FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            JOIN account_statuses acs ON u.account_status_id = acs.id
            WHERE u.email = ? AND u.deleted_at IS NULL
        ');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // User exists with this email but not linked to Google
        if ($user) {
            if ($action === 'link') {
                // This is a link action - link Google to existing account
                // First, create a file record for the avatar if it exists
                $avatarFileId = null;
                if ($avatarUrl) {
                    $stmt = $pdo->prepare('INSERT INTO files (file_url, file_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?)');
                    $stmt->execute([$avatarUrl, 'google_avatar.jpg', 0, 'image/jpeg', $user['id']]);
                    $avatarFileId = $pdo->lastInsertId();
                }
                
                $stmt = $pdo->prepare('UPDATE users SET google_id = ?, google_token = ?, google_refresh_token = ?, avatar_file_id = ?, is_verified = ? WHERE id = ?');
                $stmt->execute([$googleId, $accessToken, $refreshToken, $avatarFileId, $emailVerified ? true : $user['is_verified'], $user['id']]);

                $userId = $user['id'];
                $userRole = $user['role'];
            } else {
                // For login action, automatically link Google to existing account and log them in
                // This provides a better user experience - they don't need to manually link
                
                // First, create a file record for the avatar if it exists
                $avatarFileId = null;
                if ($avatarUrl) {
                    $stmt = $pdo->prepare('INSERT INTO files (file_url, file_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?)');
                    $stmt->execute([$avatarUrl, 'google_avatar.jpg', 0, 'image/jpeg', $user['id']]);
                    $avatarFileId = $pdo->lastInsertId();
                }
                
                // Link Google account to existing user
                $stmt = $pdo->prepare('UPDATE users SET google_id = ?, google_token = ?, google_refresh_token = ?, avatar_file_id = ?, is_verified = ? WHERE id = ?');
                $stmt->execute([$googleId, $accessToken, $refreshToken, $avatarFileId, $emailVerified ? true : $user['is_verified'], $user['id']]);

                $userId = $user['id'];
                $userRole = $user['role'];
            }
        } else {
            // New user - create account
            // For new users, we need to determine role
            // If role preference exists, use it; otherwise, redirect to choose page for role selection
            if (!$rolePreference) {
                // Store Google data in DB with a short-lived token (avoids cross-port session issues)
                $pendingToken = bin2hex(random_bytes(32));
                $expiresAt = gmdate('Y-m-d H:i:s', time() + 600); // 10 minutes (UTC)

                // Clean up expired tokens first
                $pdo->exec("DELETE FROM oauth_pending_registrations WHERE expires_at < UTC_TIMESTAMP()");

                $pendingStmt = $pdo->prepare('
                    INSERT INTO oauth_pending_registrations 
                    (token, google_id, email, first_name, last_name, avatar_url, access_token, refresh_token, email_verified, came_from_login, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ');
                $pendingStmt->execute([
                    $pendingToken,
                    $googleId,
                    $email,
                    $firstName,
                    $lastName,
                    $avatarUrl,
                    $accessToken,
                    $refreshToken,
                    $emailVerified ? 1 : 0,
                    $action === 'login' ? 1 : 0,
                    $expiresAt,
                ]);

                // Redirect to choose page with token for role selection
                header('Location: ' . buildRedirectUrl($baseUrl, '/views/public/auth/choose.html?oauth=google&token=' . $pendingToken));
                exit;
            }

            // Create new user account
            // Resolve role_id and account_status_id
            $stmt = $pdo->prepare('SELECT id FROM user_roles WHERE role_name = ?');
            $stmt->execute([$rolePreference]);
            $roleRow = $stmt->fetch(\PDO::FETCH_ASSOC);
            $roleId = $roleRow ? $roleRow['id'] : 1; // Default to first role if not found

            // Determine initial account status based on role (same logic as regular registration)
            $accountStatusName = ($rolePreference === 'landlord') ? 'pending_verification' : 'active';
            
            $stmt = $pdo->prepare('SELECT id FROM account_statuses WHERE status_name = ?');
            $stmt->execute([$accountStatusName]);
            $statusRow = $stmt->fetch(\PDO::FETCH_ASSOC);
            $accountStatusId = $statusRow ? $statusRow['id'] : 1;

            // Create file record for avatar if it exists
            $avatarFileId = null;
            if ($avatarUrl) {
                $stmt = $pdo->prepare('INSERT INTO files (file_url, file_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?)');
                $stmt->execute([$avatarUrl, 'google_avatar.jpg', 0, 'image/jpeg', 1]); // Temporary user_id, will update after user creation
                $avatarFileId = $pdo->lastInsertId();
            }

            $stmt = $pdo->prepare('
                INSERT INTO users (first_name, last_name, email, google_id, google_token, google_refresh_token, avatar_file_id, role_id, is_verified, account_status_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');

            $stmt->execute([
                $firstName,
                $lastName,
                $email,
                $googleId,
                $accessToken,
                $refreshToken,
                $avatarFileId,
                $roleId,
                $emailVerified ? 1 : 0,
                $accountStatusId
            ]);

            $userId = $pdo->lastInsertId();
            
            // Update the file record with the correct user_id
            if ($avatarFileId) {
                $stmt = $pdo->prepare('UPDATE files SET uploaded_by = ? WHERE id = ?');
                $stmt->execute([$userId, $avatarFileId]);
            }
            
            $userRole = $rolePreference;
        }
    } else {
        // Existing Google user - update tokens and info
        // Create file record for avatar if it exists and is different
        $avatarFileId = null;
        if ($avatarUrl) {
            $stmt = $pdo->prepare('INSERT INTO files (file_url, file_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$avatarUrl, 'google_avatar.jpg', 0, 'image/jpeg', $user['id']]);
            $avatarFileId = $pdo->lastInsertId();
        }
        
        $stmt = $pdo->prepare('UPDATE users SET google_token = ?, google_refresh_token = ?, avatar_file_id = ?, first_name = ?, last_name = ? WHERE id = ?');
        $stmt->execute([$accessToken, $refreshToken, $avatarFileId, $firstName, $lastName, $user['id']]);

        $userId = $user['id'];
        $userRole = $user['role'];
    }

    // Fetch verification and account status for the user
    $stmtVerified = $pdo->prepare('
        SELECT u.is_verified, acs.status_name as account_status,
               vr.verification_status_id,
               vs.status_name as verification_status
        FROM users u
        JOIN account_statuses acs ON u.account_status_id = acs.id
        LEFT JOIN verification_records vr ON vr.entity_type = "user" AND vr.entity_id = u.id
        LEFT JOIN verification_statuses vs ON vr.verification_status_id = vs.id
        WHERE u.id = ?
    ');
    $stmtVerified->execute([$userId]);
    $verifiedRow = $stmtVerified->fetch();
    $isVerified = $verifiedRow ? (bool) $verifiedRow['is_verified'] : false;
    $accountStatus = $verifiedRow['account_status'] ?? 'active';
    $verificationStatus = $verifiedRow['verification_status'] ?? null;

    if ($accountStatus !== 'active' && !($accountStatus === 'pending_verification' && $userRole === 'landlord')) {
        header('Location: ' . buildRedirectUrl($baseUrl, '/views/public/auth/login.html?error=' . urlencode('Your account is not active. Contact support.')));
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
        'verification_status' => $verificationStatus,
        'google_id' => $googleId,
    ];

    $jwtAccessToken = JWT::generate($payload, $config['jwt_expiration']);
    $jwtRefreshToken = JWT::generate($payload, $config['refresh_token_expiration']);

    // Set authentication cookies
    JWT::setAuthCookies($jwtAccessToken, $jwtRefreshToken, $config);

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
        $redirectPath = '/views/admin/index.html';
    } else if ($userRole === 'landlord') {
        $redirectPath = '/views/landlord/index.html';
    } else {
        // Boarder - determine status and redirect accordingly
        $boarderStatus = determineBoarderStatus($pdo, $userId);
        
        // Set boarder status in payload for JWT
        $payload['boarder_status'] = $boarderStatus;
        
        // Generate new JWT with boarder status
        $jwtAccessToken = JWT::generate($payload, $config['jwt_expiration']);
        $jwtRefreshToken = JWT::generate($payload, $config['refresh_token_expiration']);
        
        // Update auth cookies with new tokens
        JWT::setAuthCookies($jwtAccessToken, $jwtRefreshToken, $config);
        
        // Determine redirect path based on boarder status
        switch ($boarderStatus) {
            case 'new':
            case 'browsing':
                $redirectPath = '/views/boarder/find-a-room/index.html';
                break;
            case 'applied_pending':
                $redirectPath = '/views/boarder/applications-dashboard/index.html';
                break;
            case 'pending_confirmation':
                $redirectPath = '/views/boarder/confirm-booking/index.html';
                break;
            case 'accepted':
                $redirectPath = '/views/boarder/index.html';
                break;
            case 'rejected':
                $redirectPath = '/views/boarder/applications-dashboard/index.html';
                break;
            default:
                $redirectPath = '/views/boarder/index.html';
                break;
        }
    }

    // Ensure we're using the correct base URL
    $finalRedirectUrl = buildRedirectUrl($baseUrl, $redirectPath);
    
    // Create user data for client-side storage
    $userData = [
        'id' => $userId,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'email' => $email,
        'role' => $userRole,
        'access_token' => $jwtAccessToken,
        'refresh_token' => $jwtRefreshToken,
    ];
    
    // Add boarder status if available
    if (isset($boarderStatus)) {
        $userData['boarder_status'] = $boarderStatus;
        $userData['boarderStatus'] = $boarderStatus; // Keep both for compatibility
    }
    
    // Encode user data for URL hash fragment
    $userDataJson = urlencode(json_encode($userData));
    
    // Add hash fragment with user data
    $finalRedirectUrl .= '#auth=' . $userDataJson;
    
    // Log for debugging
    error_log('Google OAuth - Base URL: ' . $baseUrl);
    error_log('Google OAuth - Redirect path: ' . $redirectPath);
    error_log('Google OAuth - Final redirect URL: ' . $finalRedirectUrl);
    
    if (defined('APPWRITE_FUNCTION_CONTEXT')) {
        // In Appwrite context, set the result for the caller to use
        $oauthResult = [
            'success' => true,
            'user' => $userData,
            'tokens' => [
                'access_token' => $jwtAccessToken,
                'refresh_token' => $jwtRefreshToken,
            ],
            'redirect_url' => $finalRedirectUrl
        ];
    } else {
        // Standalone execution - redirect
        header('Location: ' . $finalRedirectUrl);
        exit;
    }

} catch (\Exception $e) {
    error_log('Google OAuth callback error: ' . $e->getMessage());

    // Clear session data on error
    unset($_SESSION['oauth_state']);
    unset($_SESSION['oauth_action']);
    unset($_SESSION['oauth_role_preference']);
    unset($_SESSION['pending_google_user']);

    if (defined('APPWRITE_FUNCTION_CONTEXT')) {
        // In Appwrite context, set error result
        $oauthResult = [
            'success' => false,
            'error' => 'Google authentication failed: ' . $e->getMessage()
        ];
    } else {
        // Standalone execution - redirect to login with error
        $errorMessage = urlencode('Google authentication failed: ' . $e->getMessage());
        header('Location: ' . buildRedirectUrl($baseUrl, '/views/public/auth/login.html?error=' . $errorMessage));
        exit;
    }
}
