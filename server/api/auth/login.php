<?php

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

header('Content-Type: application/json');

use App\Core\Database\Connection;
use App\Core\Auth\JWT;
use App\Core\Auth\RateLimiter;

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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$ip = $_SERVER['REMOTE_ADDR'];

try {
    if (!RateLimiter::check($ip)) {
        http_response_code(429);
        echo json_encode(['error' => 'Too many failed login attempts. Please try again in 5 minutes.']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON input']);
        exit;
    }

    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing email or password']);
        exit;
    }

    $pdo = Connection::getInstance()->getPdo();
    $config = require __DIR__ . '/../../config/app.php';

    $stmt = $pdo->prepare('SELECT id, first_name, last_name, email, password_hash, role, is_verified, account_status FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        $accountStatus = $user['account_status'] ?? 'active';
        // Allow 'active' and 'pending_verification' (landlords waiting for verification)
        if (!in_array($accountStatus, ['active', 'pending_verification'])) {
            RateLimiter::registerFailure($ip);
            http_response_code(403);
            echo json_encode(['error' => 'This account is suspended or banned. Contact support if you believe this is a mistake.']);
            exit;
        }

        RateLimiter::reset($ip);

        $payload = [
            'user_id' => $user['id'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'is_verified' => (bool) $user['is_verified'],
            'account_status' => $accountStatus,
        ];

        $accessToken = JWT::generate($payload, $config['jwt_expiration']);
        $refreshToken = JWT::generate($payload, $config['refresh_token_expiration']);

        // Set authentication cookies
        JWT::setAuthCookies($accessToken, $refreshToken, $config);

        // Determine boarder status if user is a boarder
        $boarderStatus = null;
        if ($user['role'] === 'boarder') {
            $boarderStatus = determineBoarderStatus($pdo, $user['id']);
        }

        $userResponse = [
            'id' => $user['id'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'is_verified' => (bool) $user['is_verified'],
            'account_status' => $accountStatus,
        ];

        // Add boarder status if applicable
        if ($boarderStatus !== null) {
            $userResponse['boarder_status'] = $boarderStatus;
        }

        echo json_encode([
            'success' => true,
            'access_token' => $accessToken,
            'user' => $userResponse
        ]);
    } else {
        RateLimiter::registerFailure($ip);
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password']);
    }
} catch (\Exception $e) {
    error_log('Login error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'An unexpected error occurred']);
}
