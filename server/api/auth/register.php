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

$firstName = $data['firstName'] ?? '';
$lastName = $data['lastName'] ?? '';
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';
$role = $data['role'] ?? '';
$country = $data['country'] ?? '';

if (empty($firstName) || empty($lastName) || empty($email) || empty($password) || empty($role)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/', $password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 8 characters and contain uppercase, lowercase, and numbers']);
    exit();
}

if (!in_array($role, ['boarder', 'landlord'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid role']);
    exit;
}

$pdo = Connection::getInstance()->getPdo();

// Check if email already exists
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'Email already exists']);
    exit;
}

$passwordHash = password_hash($password, PASSWORD_BCRYPT);

try {
    // TODO: Implement email verification for landlords (optional, non-blocking)
    // - Generate verification token
    // - Send verification email with link
    // - Set email_verified_at after clicking link
    // Note: Landlords can access dashboard immediately without email verification
    
    $stmt = $pdo->prepare('INSERT INTO users (first_name, last_name, email, password_hash, role, country) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$firstName, $lastName, $email, $passwordHash, $role, $country]);
    
    $userId = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'User registered successfully',
        'user' => [
            'id' => $userId,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'role' => $role,
        ]
    ]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
