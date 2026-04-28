<?php

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
    
    // Check if user exists
    $stmt = $pdo->prepare('SELECT id, google_id, password_hash FROM users WHERE email = ? AND deleted_at IS NULL');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        // Don't reveal whether email exists for security
        echo json_encode(['message' => 'If this email exists, a reset code has been sent']);
        exit;
    }
    
    // Generate a 6-digit reset code
    $resetCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = time() + (15 * 60); // 15 minutes from now
    
    // Check if there's an existing reset request for this user
    $existingStmt = $pdo->prepare('SELECT id FROM password_reset_requests WHERE user_id = ? AND expires_at > ? AND is_used = FALSE');
    $existingStmt->execute([$user['id'], time()]);
    $existing = $existingStmt->fetch();
    
    if ($existing) {
        // Update existing request
        $updateStmt = $pdo->prepare('UPDATE password_reset_requests SET reset_code = ?, expires_at = ?, attempts = 0, created_at = ? WHERE id = ?');
        $updateStmt->execute([$resetCode, $expiresAt, time(), $existing['id']]);
    } else {
        // Create new reset request
        $insertStmt = $pdo->prepare('INSERT INTO password_reset_requests (user_id, email, reset_code, expires_at, attempts, is_used, created_at) VALUES (?, ?, ?, ?, 0, FALSE, ?)');
        $insertStmt->execute([$user['id'], $email, $resetCode, $expiresAt, time()]);
    }
    
    // Check if this is a Google OAuth user
    $isGoogleUser = !empty($user['google_id']) && empty($user['password_hash']);
    
    if ($isGoogleUser) {
        echo json_encode([
            'message' => 'Password setup instructions sent to your email',
            'is_google_user' => true,
            'action' => 'password_setup',
            'reset_code' => $resetCode // Remove in production
        ]);
    } else {
        echo json_encode([
            'message' => 'Reset code has been sent to your email',
            'reset_code' => $resetCode // Remove in production
        ]);
    }
    
} catch (Exception $e) {
    error_log('Forgot password error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}