<?php
/**
 * Google OAuth Complete Registration Endpoint
 * 
 * Completes the Google OAuth registration process by creating a user account
 * with the selected role from the choose page.
 */

require_once __DIR__ . '/../../cors.php';
require_once __DIR__ . '/../../../src/Core/bootstrap.php';

use App\Core\Auth\JWT;
use App\Core\Database\Connection;

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['role'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Role is required']);
    exit;
}

$selectedRole = $input['role'];

// Validate role
if (!in_array($selectedRole, ['boarder', 'landlord'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid role']);
    exit;
}

// Check if we have pending Google user data in session
if (!isset($_SESSION['pending_google_user'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No pending Google registration found. Please try logging in with Google again.']);
    exit;
}

$googleUser = $_SESSION['pending_google_user'];

// Validate required Google user data
$requiredFields = ['google_id', 'email', 'first_name', 'last_name'];
foreach ($requiredFields as $field) {
    if (empty($googleUser[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid Google user data. Please try logging in again.']);
        exit;
    }
}

try {
    // Connect to database
    $pdo = Connection::getInstance()->getPdo();
    $config = require __DIR__ . '/../../../config/app.php';

    // Check if user already exists by Google ID or email
    $stmt = $pdo->prepare('
        SELECT u.id, u.first_name, u.last_name, u.email, 
               ur.role_name as role, u.is_verified, acs.status_name as account_status
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        JOIN account_statuses acs ON u.account_status_id = acs.id
        WHERE (u.google_id = ? OR u.email = ?) AND u.deleted_at IS NULL
    ');
    $stmt->execute([$googleUser['google_id'], $googleUser['email']]);
    $existingUser = $stmt->fetch();

    if ($existingUser) {
        // User already exists, just log them in
        $userId = $existingUser['id'];
        $userRole = $existingUser['role'];
    } else {
        // Create new user account
        // Resolve role_id and account_status_id
        $stmt = $pdo->prepare('SELECT id FROM user_roles WHERE role_name = ?');
        $stmt->execute([$selectedRole]);
        $roleRow = $stmt->fetch(\PDO::FETCH_ASSOC);
        $roleId = $roleRow ? $roleRow['id'] : 1; // Default to first role if not found

        $stmt = $pdo->prepare('SELECT id FROM account_statuses WHERE status_name = ?');
        $stmt->execute(['active']);
        $statusRow = $stmt->fetch(\PDO::FETCH_ASSOC);
        $accountStatusId = $statusRow ? $statusRow['id'] : 1;

        // Create file record for avatar if it exists
        $avatarFileId = null;
        if ($googleUser['avatar_url']) {
            $stmt = $pdo->prepare('INSERT INTO files (file_url, file_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$googleUser['avatar_url'], 'google_avatar.jpg', 0, 'image/jpeg', 1]); // Temporary user_id, will update after user creation
            $avatarFileId = $pdo->lastInsertId();
        }

        $stmt = $pdo->prepare('
            INSERT INTO users (first_name, last_name, email, google_id, google_token, google_refresh_token, avatar_file_id, role_id, is_verified, account_status_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');

        $stmt->execute([
            $googleUser['first_name'],
            $googleUser['last_name'],
            $googleUser['email'],
            $googleUser['google_id'],
            $googleUser['access_token'],
            $googleUser['refresh_token'],
            $avatarFileId,
            $roleId,
            $googleUser['email_verified'] ? 1 : 0,
            $accountStatusId
        ]);

        $userId = $pdo->lastInsertId();
        
        // Update the file record with the correct user_id
        if ($avatarFileId) {
            $stmt = $pdo->prepare('UPDATE files SET uploaded_by = ? WHERE id = ?');
            $stmt->execute([$userId, $avatarFileId]);
        }
        
        $userRole = $selectedRole;
    }

    // Fetch verification and account status for the user
    $stmtVerified = $pdo->prepare('
        SELECT u.is_verified, acs.status_name as account_status
        FROM users u
        JOIN account_statuses acs ON u.account_status_id = acs.id
        WHERE u.id = ?
    ');
    $stmtVerified->execute([$userId]);
    $verifiedRow = $stmtVerified->fetch();
    $isVerified = $verifiedRow ? (bool) $verifiedRow['is_verified'] : false;
    $accountStatus = $verifiedRow['account_status'] ?? 'active';

    if ($accountStatus !== 'active') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Your account is not active. Contact support.']);
        exit;
    }

    // Generate JWT tokens
    $payload = [
        'user_id' => $userId,
        'first_name' => $googleUser['first_name'],
        'last_name' => $googleUser['last_name'],
        'email' => $googleUser['email'],
        'role' => $userRole,
        'is_verified' => $isVerified,
        'account_status' => $accountStatus,
        'google_id' => $googleUser['google_id'],
    ];

    $jwtAccessToken = JWT::generate($payload, $config['jwt_expiration']);
    $jwtRefreshToken = JWT::generate($payload, $config['refresh_token_expiration']);

    // Set authentication cookies
    JWT::setAuthCookies($jwtAccessToken, $jwtRefreshToken, $config);

    // Store user info in session for immediate access
    $_SESSION['user'] = [
        'id' => $userId,
        'first_name' => $googleUser['first_name'],
        'last_name' => $googleUser['last_name'],
        'email' => $googleUser['email'],
        'role' => $userRole,
    ];

    // Clear pending data
    unset($_SESSION['pending_google_user']);
    unset($_SESSION['oauth_action']);
    unset($_SESSION['oauth_role_preference']);

    echo json_encode([
        'success' => true,
        'message' => 'Registration completed successfully',
        'user' => [
            'id' => $userId,
            'first_name' => $googleUser['first_name'],
            'last_name' => $googleUser['last_name'],
            'email' => $googleUser['email'],
            'role' => $userRole,
        ]
    ]);

} catch (\Exception $e) {
    error_log('Google OAuth complete registration error: ' . $e->getMessage());

    // Clear session data on error
    unset($_SESSION['pending_google_user']);
    unset($_SESSION['oauth_action']);
    unset($_SESSION['oauth_role_preference']);

    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
}