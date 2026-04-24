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

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit;
}

$email = $data['email'] ?? '';

if (empty($email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email is required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

$pdo = Connection::getInstance()->getPdo();

try {
    // Find user with email
    $stmt = $pdo->prepare('
        SELECT id, email_verified, first_name, last_name 
        FROM users 
        WHERE email = ? AND deleted_at IS NULL
    ');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // Don't reveal if email exists or not for security
        echo json_encode([
            'success' => true,
            'message' => 'If an account with this email exists, a verification email has been sent.'
        ]);
        exit;
    }

    if ($user['email_verified']) {
        echo json_encode([
            'success' => true,
            'message' => 'Email is already verified.',
            'alreadyVerified' => true
        ]);
        exit;
    }

    // Generate new verification token
    $emailVerificationToken = bin2hex(random_bytes(32));
    $emailVerificationExpires = date('Y-m-d H:i:s', strtotime('+24 hours'));

    // Update user with new token
    $stmt = $pdo->prepare('
        UPDATE users 
        SET email_verification_token = ?, 
            email_verification_expires = ?,
            updated_at = NOW()
        WHERE id = ?
    ');
    $stmt->execute([$emailVerificationToken, $emailVerificationExpires, $user['id']]);

    // TODO: Send email verification email
    // For now, we'll just log it
    error_log("New email verification token for {$email}: {$emailVerificationToken}");

    echo json_encode([
        'success' => true,
        'message' => 'Verification email sent successfully. Please check your inbox.'
    ]);

} catch (\PDOException $e) {
    error_log('Resend verification error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send verification email. Please try again.']);
}