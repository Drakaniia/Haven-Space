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

$token = $data['token'] ?? '';
$email = $data['email'] ?? '';

if (empty($token) || empty($email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing token or email']);
    exit;
}

$pdo = Connection::getInstance()->getPdo();

try {
    // Find user with matching email and token
    $stmt = $pdo->prepare('
        SELECT id, email_verified, email_verification_expires, role, account_status 
        FROM users 
        WHERE email = ? AND email_verification_token = ? AND deleted_at IS NULL
    ');
    $stmt->execute([$email, $token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid verification token']);
        exit;
    }

    if ($user['email_verified']) {
        echo json_encode([
            'success' => true,
            'message' => 'Email already verified',
            'alreadyVerified' => true
        ]);
        exit;
    }

    // Check if token has expired
    if (strtotime($user['email_verification_expires']) < time()) {
        http_response_code(400);
        echo json_encode(['error' => 'Verification token has expired']);
        exit;
    }

    // Update user as email verified
    $stmt = $pdo->prepare('
        UPDATE users 
        SET email_verified = TRUE, 
            email_verification_token = NULL, 
            email_verification_expires = NULL,
            updated_at = NOW()
        WHERE id = ?
    ');
    $stmt->execute([$user['id']]);

    $message = 'Email verified successfully!';
    $nextSteps = [];

    if ($user['role'] === 'landlord') {
        $message = 'Email verified! Your landlord account is now ready for document verification.';
        $nextSteps = [
            'Upload required verification documents',
            'Wait for admin approval (24-48 hours)',
            'Start listing your properties'
        ];
    } else {
        $message = 'Email verified! You can now apply to rooms and access all boarder features.';
        $nextSteps = [
            'Complete your profile (optional)',
            'Start browsing available rooms',
            'Save your favorite listings'
        ];
    }

    echo json_encode([
        'success' => true,
        'message' => $message,
        'nextSteps' => $nextSteps,
        'role' => $user['role'],
        'accountStatus' => $user['account_status']
    ]);

} catch (\PDOException $e) {
    error_log('Email verification error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Verification failed. Please try again.']);
}