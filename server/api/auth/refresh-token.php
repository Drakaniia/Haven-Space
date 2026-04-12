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
    'SELECT id, first_name, last_name, email, role, is_verified, account_status FROM users WHERE id = ?'
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

// Set new access token cookie
setcookie('access_token', $newAccessToken, [
    'expires' => time() + $config['jwt_expiration'],
    'path' => '/',
    'domain' => '',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax'
]);

echo json_encode([
    'success' => true,
    'message' => 'Token refreshed successfully'
]);
