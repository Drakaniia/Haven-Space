<?php

/**
 * Landlord Verification Status Endpoint
 * 
 * GET /api/landlord/verification-status.php
 * 
 * Returns the current verification status for the authenticated landlord.
 * Used by frontend polling to detect when admin approves account.
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

header('Content-Type: application/json');

use App\Core\Auth\JWT;
use App\Core\Database\Connection;

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get token from cookie
$token = $_COOKIE['access_token'] ?? '';

if (empty($token)) {
    http_response_code(401);
    echo json_encode(['error' => 'No token provided']);
    exit;
}

// Validate JWT token
$payload = JWT::validate($token);

if (!$payload) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid or expired token']);
    exit;
}

$userId = (int) ($payload['user_id'] ?? 0);

if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid user ID']);
    exit;
}

// Get user from database
$pdo = Connection::getInstance()->getPdo();
$stmt = $pdo->prepare(
    'SELECT id, role, is_verified, account_status, created_at FROM users WHERE id = ?'
);
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

// Verify this is a landlord
if ($user['role'] !== 'landlord') {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied. This endpoint is for landlords only.']);
    exit;
}

// Return verification status
echo json_encode([
    'success' => true,
    'data' => [
        'user_id' => (int) $user['id'],
        'role' => $user['role'],
        'is_verified' => (bool) $user['is_verified'],
        'account_status' => $user['account_status'] ?? 'active',
        'created_at' => $user['created_at'],
        'checked_at' => date('Y-m-d H:i:s'),
    ],
]);
