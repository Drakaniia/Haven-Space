<?php
/**
 * Finalize Google OAuth Signup
 * 
 * Completes the signup process for Google OAuth users who need to select a role.
 * Creates the user account with the selected role and stored Google data.
 */

require_once __DIR__ . '/../../cors.php';
require_once __DIR__ . '/../../../src/Core/bootstrap.php';

use App\Core\Auth\JWT;
use App\Core\Database\Connection;

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Get pending user data from session
    $pendingUser = $_SESSION['pending_google_user'] ?? null;
    
    if (!$pendingUser) {
        http_response_code(400);
        echo json_encode(['error' => 'No pending Google signup found. Please start the signup process again.']);
        exit;
    }
    
    // Get role and country from request
    $data = json_decode(file_get_contents('php://input'), true);
    $role = $data['role'] ?? null;
    $country = $data['country'] ?? null;
    
    if (!$role || !in_array($role, ['boarder', 'landlord'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid role selected']);
        exit;
    }
    
    // Connect to database
    $pdo = Connection::getInstance()->getPdo();
    $config = require __DIR__ . '/../../../config/app.php';
    
    // Check if user already exists (by Google ID or email)
    $stmt = $pdo->prepare('SELECT id FROM users WHERE google_id = ? OR email = ?');
    $stmt->execute([$pendingUser['google_id'], $pendingUser['email']]);
    
    if ($stmt->fetch()) {
        // User already exists, clear pending data
        unset($_SESSION['pending_google_user']);
        http_response_code(400);
        echo json_encode(['error' => 'User already exists. Please login instead.']);
        exit;
    }
    
    // Create user account
    $stmt = $pdo->prepare('
        INSERT INTO users (first_name, last_name, email, google_id, google_token, google_refresh_token, avatar_url, role, is_verified, country) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    
    $stmt->execute([
        $pendingUser['first_name'],
        $pendingUser['last_name'],
        $pendingUser['email'],
        $pendingUser['google_id'],
        $pendingUser['access_token'],
        $pendingUser['refresh_token'],
        $pendingUser['avatar_url'],
        $role,
        $pendingUser['email_verified'] ? 1 : 0,
        $country,
    ]);
    
    $userId = $pdo->lastInsertId();
    
    // Generate JWT tokens
    $payload = [
        'user_id' => $userId,
        'first_name' => $pendingUser['first_name'],
        'last_name' => $pendingUser['last_name'],
        'email' => $pendingUser['email'],
        'role' => $role,
        'is_verified' => (bool) ($pendingUser['email_verified'] ?? false),
        'account_status' => 'active',
        'google_id' => $pendingUser['google_id'],
    ];
    
    $jwtAccessToken = JWT::generate($payload, $config['jwt_expiration']);
    $jwtRefreshToken = JWT::generate($payload, $config['refresh_token_expiration']);
    
    // Set cookies
    setcookie('access_token', $jwtAccessToken, [
        'expires' => time() + $config['jwt_expiration'],
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    
    setcookie('refresh_token', $jwtRefreshToken, [
        'expires' => time() + $config['refresh_token_expiration'],
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    
    // Clear pending user data
    unset($_SESSION['pending_google_user']);
    
    // Determine boarder status if user is a boarder
    $boarderStatus = null;
    if ($role === 'boarder') {
        // New boarder has no applications yet
        $boarderStatus = 'new';
    }
    
    // Return success with user data and tokens
    $userResponse = [
        'id' => $userId,
        'first_name' => $pendingUser['first_name'],
        'last_name' => $pendingUser['last_name'],
        'email' => $pendingUser['email'],
        'role' => $role,
        'is_verified' => (bool) ($pendingUser['email_verified'] ?? false),
        'account_status' => 'active',
    ];
    
    // Add boarder status if applicable
    if ($boarderStatus !== null) {
        $userResponse['boarder_status'] = $boarderStatus;
    }
    
    echo json_encode([
        'success' => true,
        'access_token' => $jwtAccessToken,
        'refresh_token' => $jwtRefreshToken,
        'user' => $userResponse,
    ]);
    
} catch (\Exception $e) {
    error_log('Google OAuth finalize signup error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'An unexpected error occurred. Please try again.']);
}
