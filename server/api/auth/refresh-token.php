<?php

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

header('Content-Type: application/json');

use App\Core\Auth\JWT;
use App\Core\Database\Connection;

$refreshToken = $_COOKIE['refresh_token'] ?? '';

if (empty($refreshToken)) {
    http_response_code(401);
    echo json_encode(['error' => 'No refresh token provided']);
    exit;
}

$oldPayload = JWT::validate($refreshToken);

if (!$oldPayload) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid or expired refresh token']);
    exit;
}

$userId = (int) ($oldPayload['user_id'] ?? 0);
if ($userId < 1) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid refresh token']);
    exit;
}

$pdo = Connection::getInstance()->getPdo();
$stmt = $pdo->prepare(
    'SELECT u.id, u.first_name, u.last_name, u.email, 
            ur.role_name as role, u.is_verified, acs.status_name as account_status
     FROM users u
     JOIN user_roles ur ON u.role_id = ur.id
     JOIN account_statuses acs ON u.account_status_id = acs.id
     WHERE u.id = ? AND u.deleted_at IS NULL'
);
$stmt->execute([$userId]);
$row = $stmt->fetch();

if (!$row) {
    http_response_code(401);
    echo json_encode(['error' => 'User not found']);
    exit;
}

$accountStatus = $row['account_status'] ?? 'active';
if ($accountStatus !== 'active') {
    http_response_code(403);
    echo json_encode(['error' => 'Account is not active']);
    exit;
}

$payload = [
    'user_id' => (int) $row['id'],
    'first_name' => $row['first_name'],
    'last_name' => $row['last_name'],
    'email' => $row['email'],
    'role' => $row['role'],
    'is_verified' => (bool) $row['is_verified'],
    'account_status' => $accountStatus,
];

$config = require __DIR__ . '/../../config/app.php';

// Generate new access token
$newAccessToken = JWT::generate($payload, $config['jwt_expiration']);

// Generate new refresh token as well (rotate refresh tokens for better security)
$newRefreshToken = JWT::generate($payload, $config['refresh_token_expiration']);

// Set new authentication cookies
JWT::setAuthCookies($newAccessToken, $newRefreshToken, $config);

echo json_encode([
    'success' => true,
    'message' => 'Token refreshed successfully'
]);
