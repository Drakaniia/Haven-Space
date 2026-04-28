<?php
/**
 * Check Email Endpoint
 * 
 * Checks if an email is associated with a Google OAuth account
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

header('Content-Type: application/json');

use App\Core\Database\Connection;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['email']) || empty(trim($input['email']))) {
        http_response_code(400);
        echo json_encode(['error' => 'Email is required']);
        exit;
    }
    
    $email = trim($input['email']);
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email format']);
        exit;
    }
    
    $pdo = Connection::getInstance()->getPdo();
    
    // Check if user exists and if they have a Google OAuth account
    $stmt = $pdo->prepare('SELECT google_id, password_hash FROM users WHERE email = ? AND deleted_at IS NULL');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        // User doesn't exist
        echo json_encode([
            'exists' => false,
            'is_google_account' => false
        ]);
        exit;
    }
    
    $isGoogleAccount = !empty($user['google_id']) && empty($user['password_hash']);
    
    echo json_encode([
        'exists' => true,
        'is_google_account' => $isGoogleAccount
    ]);
    
} catch (Exception $e) {
    error_log('Check email error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}