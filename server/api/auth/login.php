<?php

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

header('Content-Type: application/json');

use App\Core\Database\Connection;
use App\Core\Auth\JWT;
use App\Core\Auth\RateLimiter;

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
        if ($accountStatus !== 'active') {
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

        // Set Cookies
        setcookie('access_token', $accessToken, [
            'expires' => time() + $config['jwt_expiration'],
            'path' => '/',
            'domain' => '',
            'secure' => false, // Set to true if using HTTPS
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        setcookie('refresh_token', $refreshToken, [
            'expires' => time() + $config['refresh_token_expiration'],
            'path' => '/',
            'domain' => '',
            'secure' => false, // Set to true if using HTTPS
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'is_verified' => (bool) $user['is_verified'],
                'account_status' => $accountStatus,
            ]
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
