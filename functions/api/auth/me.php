<?php

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

header('Content-Type: application/json');

use App\Core\Auth\JWT;
use App\Core\Database\Connection;

/**
 * Determine boarder status based on applications
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

$token = '';

// Check Authorization header first
$authHeader = '';
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
} elseif (function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
    }
}

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
}

// Fallback to cookie if no Authorization header
if (empty($token)) {
    $token = $_COOKIE['access_token'] ?? '';
}

$simulatedId = $_SERVER['HTTP_X_USER_ID'] ?? $_GET['user_id'] ?? null;

if (empty($token) && $simulatedId) {
    // Simulation bypass for testing
    $userId = (int) $simulatedId;
    $pdo = Connection::getInstance()->getPdo();
    $stmt = $pdo->prepare(
        'SELECT u.id, u.first_name, u.last_name, u.email, 
                ur.role_name as role, u.is_verified, u.email_verified, acs.status_name as account_status, 
                f.file_url as avatar_url, vr.verification_status_id,
                vs.status_name as verification_status
         FROM users u
         JOIN user_roles ur ON u.role_id = ur.id
         JOIN account_statuses acs ON u.account_status_id = acs.id
         LEFT JOIN files f ON u.avatar_file_id = f.id
         LEFT JOIN verification_records vr ON vr.entity_type = "user" AND vr.entity_id = u.id
         LEFT JOIN verification_statuses vs ON vr.verification_status_id = vs.id
         WHERE u.id = ? AND u.deleted_at IS NULL
         ORDER BY 
             CASE vs.status_name
                 WHEN "approved" THEN 1
                 WHEN "pending" THEN 2
                 WHEN "rejected" THEN 3
                 ELSE 4
             END,
             vr.reviewed_at DESC,
             vr.submitted_at DESC
         LIMIT 1'
    );
    $stmt->execute([$userId]);
    $userRow = $stmt->fetch();
    
    if ($userRow) {
        $simVerificationStatus = $userRow['verification_status'] ?? null;
        if ($userRow['role'] === 'landlord' && $simVerificationStatus === null) {
            $simVerificationStatus = $userRow['is_verified'] ? 'approved' : 'pending';
        }
        $user = [
            'id' => (int) $userRow['id'],
            'user_id' => (int) $userRow['id'],
            'first_name' => $userRow['first_name'],
            'last_name' => $userRow['last_name'],
            'email' => $userRow['email'],
            'role' => $userRow['role'],
            'is_verified' => (bool) $userRow['is_verified'],
            'email_verified' => (bool) $userRow['email_verified'],
            'account_status' => $userRow['account_status'] ?? 'active',
            'avatar_url' => $userRow['avatar_url'],
            'verification_status' => $simVerificationStatus,
        ];
        echo json_encode(['success' => true, 'user' => $user]);
        exit;
    }
}

if (empty($token)) {
    http_response_code(401);
    echo json_encode(['error' => 'No token provided']);
    exit;
}

$payload = JWT::validate($token);

if (!$payload) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid or expired token']);
    exit;
}

$userId = (int) ($payload['user_id'] ?? 0);
$userRow = null;
if ($userId > 0) {
    $pdo = Connection::getInstance()->getPdo();
    $stmt = $pdo->prepare(
        'SELECT u.id, u.first_name, u.last_name, u.email, 
                ur.role_name as role, u.is_verified, u.email_verified, acs.status_name as account_status, 
                f.file_url as avatar_url
         FROM users u
         JOIN user_roles ur ON u.role_id = ur.id
         JOIN account_statuses acs ON u.account_status_id = acs.id
         LEFT JOIN files f ON u.avatar_file_id = f.id
         WHERE u.id = ? AND u.deleted_at IS NULL'
    );
    $stmt->execute([$userId]);
    $userRow = $stmt->fetch();
}

if ($userRow) {
    if (in_array($userRow['account_status'] ?? 'active', ['suspended', 'banned'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Account is suspended or banned']);
        exit;
    }
    // Derive verification_status for landlords:
    // If a verification_records row exists, use its status_name.
    // Otherwise fall back to is_verified flag so admin approvals via
    // the simple is_verified=1 path are still recognised.
    $verificationStatus = $userRow['verification_status'] ?? null;
    if ($userRow['role'] === 'landlord' && $verificationStatus === null) {
        $verificationStatus = $userRow['is_verified'] ? 'approved' : 'pending';
    }

    $user = [
        'id' => (int) $userRow['id'],
        'user_id' => (int) $userRow['id'],
        'first_name' => $userRow['first_name'],
        'last_name' => $userRow['last_name'],
        'email' => $userRow['email'],
        'role' => $userRow['role'],
        'is_verified' => (bool) $userRow['is_verified'],
        'email_verified' => (bool) $userRow['email_verified'],
        'account_status' => $userRow['account_status'] ?? 'active',
        'avatar_url' => $userRow['avatar_url'],
        'verification_status' => $verificationStatus,
    ];
    
    // Add boarder status if user is a boarder
    if ($userRow['role'] === 'boarder') {
        $user['boarder_status'] = determineBoarderStatus($pdo, (int) $userRow['id']);
    }
} else {
    $user = array_merge(
        [
            'id' => $userId,
            'account_status' => $payload['account_status'] ?? 'active',
            'avatar_url' => null,
        ],
        $payload
    );
    
    // Add boarder status if user is a boarder
    if (($payload['role'] ?? '') === 'boarder') {
        $user['boarder_status'] = determineBoarderStatus($pdo, $userId);
    }
}

echo json_encode([
    'success' => true,
    'user' => $user,
]);
