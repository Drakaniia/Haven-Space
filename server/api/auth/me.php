<?php

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

header('Content-Type: application/json');

use App\Core\Auth\JWT;
use App\Core\Database\Connection;

$token = $_COOKIE['access_token'] ?? '';
$simulatedId = $_SERVER['HTTP_X_USER_ID'] ?? $_GET['user_id'] ?? null;

if (empty($token) && $simulatedId) {
    // Simulation bypass for testing
    $userId = (int) $simulatedId;
    $pdo = Connection::getInstance()->getPdo();
    $stmt = $pdo->prepare(
        'SELECT id, first_name, last_name, email, role, is_verified, account_status, avatar_url FROM users WHERE id = ?'
    );
    $stmt->execute([$userId]);
    $userRow = $stmt->fetch();
    
    if ($userRow) {
        $user = [
            'id' => (int) $userRow['id'],
            'user_id' => (int) $userRow['id'],
            'first_name' => $userRow['first_name'],
            'last_name' => $userRow['last_name'],
            'email' => $userRow['email'],
            'role' => $userRow['role'],
            'is_verified' => (bool) $userRow['is_verified'],
            'account_status' => $userRow['account_status'] ?? 'active',
            'avatar_url' => $userRow['avatar_url'],
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
        'SELECT id, first_name, last_name, email, role, is_verified, account_status, avatar_url FROM users WHERE id = ?'
    );
    $stmt->execute([$userId]);
    $userRow = $stmt->fetch();
}

if ($userRow) {
    if (($userRow['account_status'] ?? 'active') !== 'active') {
        http_response_code(403);
        echo json_encode(['error' => 'Account is suspended or banned']);
        exit;
    }
    $user = [
        'id' => (int) $userRow['id'],
        'user_id' => (int) $userRow['id'],
        'first_name' => $userRow['first_name'],
        'last_name' => $userRow['last_name'],
        'email' => $userRow['email'],
        'role' => $userRow['role'],
        'is_verified' => (bool) $userRow['is_verified'],
        'account_status' => $userRow['account_status'] ?? 'active',
        'avatar_url' => $userRow['avatar_url'],
    ];
} else {
    $user = array_merge(
        [
            'id' => $userId,
            'account_status' => $payload['account_status'] ?? 'active',
            'avatar_url' => null,
        ],
        $payload
    );
}

echo json_encode([
    'success' => true,
    'user' => $user,
]);
