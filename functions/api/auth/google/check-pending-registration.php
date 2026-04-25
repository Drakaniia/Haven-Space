<?php
/**
 * Check Pending Google Registration Endpoint
 *
 * Checks if a pending Google OAuth registration exists for the given token.
 */

require_once __DIR__ . '/../../cors.php';
require_once __DIR__ . '/../../../src/Core/bootstrap.php';

use App\Core\Database\Connection;

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get token from query parameters
$token = $_GET['token'] ?? null;

if (!$token) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Token is required']);
    exit;
}

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Check if pending registration exists and is not expired
    $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM oauth_pending_registrations WHERE token = ? AND expires_at > UTC_TIMESTAMP()');
    $stmt->execute([$token]);
    $count = $stmt->fetchColumn();
    
    echo json_encode([
        'success' => true,
        'exists' => ($count > 0)
    ]);
    
} catch (Exception $e) {
    error_log('Check pending registration error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
}