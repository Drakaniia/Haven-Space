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
$phoneNumber = $data['phoneNumber'] ?? '';

// Additional landlord profile data
$businessName = $data['businessName'] ?? '';
$businessDescription = $data['businessDescription'] ?? '';
$city = $data['city'] ?? '';
$province = $data['province'] ?? '';
$experienceLevel = $data['experienceLevel'] ?? '';
$idType = $data['idType'] ?? '';
$idNumber = $data['idNumber'] ?? '';

if (empty($firstName) || empty($lastName) || empty($email) || empty($password) || empty($role)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

// Additional validation for landlords
if ($role === 'landlord') {
    if (empty($businessName) || empty($city) || empty($province) || empty($phoneNumber) || empty($idType) || empty($idNumber)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required landlord profile fields']);
        exit;
    }
    
    // Validate phone number format (Philippine mobile)
    $cleanPhone = preg_replace('/\D/', '', $phoneNumber);
    if (!preg_match('/^(63|0)?9\d{9}$/', $cleanPhone)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid Philippine mobile number format']);
        exit;
    }
    
    // Format phone number to +63 format
    if (substr($cleanPhone, 0, 2) === '63') {
        $phoneNumber = '+' . $cleanPhone;
    } elseif (substr($cleanPhone, 0, 1) === '0') {
        $phoneNumber = '+63' . substr($cleanPhone, 1);
    } else {
        $phoneNumber = '+63' . $cleanPhone;
    }
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 8 characters long']);
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
    echo json_encode([
        'success' => false,
        'error' => 'Email already exists',
        'message' => 'This email address is already registered. Please use a different email or try logging in instead.'
    ]);
    exit;
}

$passwordHash = password_hash($password, PASSWORD_BCRYPT);

// Generate email verification token
$emailVerificationToken = bin2hex(random_bytes(32));
$emailVerificationExpires = date('Y-m-d H:i:s', strtotime('+24 hours'));

try {
    // Start transaction
    if (!$pdo->beginTransaction()) {
        throw new \RuntimeException("Failed to start database transaction");
    }
    
    // Determine initial account status based on role
    $accountStatusName = ($role === 'landlord') ? 'pending_verification' : 'active';
    $accountStatus = $accountStatusName; // keep for JWT payload
    $verificationStatus = ($role === 'landlord') ? 'pending' : null;

    // Resolve role_id from user_roles lookup table
    $stmt = $pdo->prepare('SELECT id FROM user_roles WHERE role_name = ?');
    $stmt->execute([$role]);
    $roleRow = $stmt->fetch(\PDO::FETCH_ASSOC);
    if (!$roleRow) {
        throw new \RuntimeException("Unknown role: $role");
    }
    $roleId = $roleRow['id'];

    // Resolve account_status_id from account_statuses lookup table
    $stmt = $pdo->prepare('SELECT id FROM account_statuses WHERE status_name = ?');
    $stmt->execute([$accountStatusName]);
    $statusRow = $stmt->fetch(\PDO::FETCH_ASSOC);
    if (!$statusRow) {
        throw new \RuntimeException("Unknown account status: $accountStatusName");
    }
    $accountStatusId = $statusRow['id'];

    // Create user account
    $stmt = $pdo->prepare('
        INSERT INTO users 
        (first_name, last_name, email, phone, password_hash, role_id,
         email_verification_token, email_verification_expires, account_status_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $firstName, $lastName, $email, $phoneNumber, $passwordHash, $roleId,
        $emailVerificationToken, $emailVerificationExpires, $accountStatusId
    ]);
    
    $userId = $pdo->lastInsertId();

    // Create role-specific profiles
    if ($role === 'landlord') {
        // Resolve property_type_id (default to first available type)
        $stmt = $pdo->prepare('SELECT id FROM property_types LIMIT 1');
        $stmt->execute();
        $propTypeRow = $stmt->fetch(\PDO::FETCH_ASSOC);
        $propertyTypeId = $propTypeRow ? $propTypeRow['id'] : 1;

        // Create landlord profile
        $stmt = $pdo->prepare('
            INSERT INTO landlord_profiles 
            (user_id, boarding_house_name, boarding_house_description, property_type_id, total_rooms, available_rooms) 
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([$userId, $businessName, $businessDescription, $propertyTypeId, 1, 1]);

        // Create a verification record for the landlord
        $stmt = $pdo->prepare('SELECT id FROM verification_statuses WHERE status_name = ?');
        $stmt->execute(['pending']);
        $vsRow = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($vsRow) {
            $stmt = $pdo->prepare('
                INSERT INTO verification_records 
                (entity_type, entity_id, verification_status_id, submitted_at) 
                VALUES (?, ?, ?, NOW())
            ');
            $stmt->execute(['user', $userId, $vsRow['id']]);
        }

        // Store additional verification data
        $pdo->exec('
            CREATE TABLE IF NOT EXISTS landlord_verification_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                phone_number VARCHAR(20),
                experience_level VARCHAR(50),
                id_type VARCHAR(50),
                id_number VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ');
        $stmt = $pdo->prepare('
            INSERT INTO landlord_verification_data 
            (user_id, phone_number, experience_level, id_type, id_number) 
            VALUES (?, ?, ?, ?, ?)
        ');
        $stmt->execute([$userId, $phoneNumber, $experienceLevel, $idType, $idNumber]);

    } elseif ($role === 'boarder') {
        // Create basic boarder profile
        $stmt = $pdo->prepare('
            INSERT INTO boarder_profiles (user_id, profile_completed) 
            VALUES (?, ?)
        ');
        $stmt->execute([$userId, false]);
    }
    
    // Commit transaction
    $pdo->commit();

    // Sync user to Appwrite and assign role label
    try {
        $appwrite = new \App\Services\AppwriteService();
        $appwrite->createUserWithRole(
            localUserId: $userId,
            email: $email,
            password: $password,
            name: trim($firstName . ' ' . $lastName),
            role: $role
        );
    } catch (\Throwable $e) {
        // Non-fatal: local registration succeeded; log and continue
        error_log('Appwrite sync failed for user ' . $userId . ': ' . $e->getMessage());
    }

    // TODO: Send email verification email
    // For now, we'll just log it
    error_log("Email verification token for {$email}: {$emailVerificationToken}");

    // Generate JWT tokens for automatic login
    $config = require __DIR__ . '/../../config/app.php';
    
    $jwtPayload = [
        'user_id' => $userId,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'email' => $email,
        'role' => $role,
        'is_verified' => false,
        'account_status' => $accountStatus,
        'verification_status' => $verificationStatus
    ];
    
    $jwtAccessToken = \App\Core\Auth\JWT::generate($jwtPayload, $config['jwt_expiration']);
    $jwtRefreshToken = \App\Core\Auth\JWT::generate($jwtPayload, $config['refresh_token_expiration']);
    
    // Set authentication cookies
    \App\Core\Auth\JWT::setAuthCookies($jwtAccessToken, $jwtRefreshToken, $config);

    $responseData = [
        'success' => true,
        'message' => 'User registered successfully',
        'access_token' => $jwtAccessToken,
        'refresh_token' => $jwtRefreshToken,
        'user' => [
            'id' => $userId,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'role' => $role,
            'account_status' => $accountStatus,
            'email_verified' => false,
            'verification_status' => $verificationStatus,
            'boarder_status' => $role === 'boarder' ? 'new' : null
        ]
    ];

    // Add role-specific messaging
    if ($role === 'landlord') {
        $responseData['message'] = 'Landlord account created successfully. Please check your email to verify your account, then complete the verification process.';
        $responseData['nextSteps'] = [
            'Verify your email address',
            'Upload required verification documents',
            'Wait for admin approval (24-48 hours)',
            'Start listing your properties'
        ];
    } else {
        $responseData['message'] = 'Boarder account created successfully. Please check your email to verify your account.';
        $responseData['nextSteps'] = [
            'Verify your email address',
            'Complete your profile (optional)',
            'Start browsing available rooms'
        ];
    }

    echo json_encode($responseData);
} catch (\PDOException $e) {
    // Rollback transaction on error if transaction is active
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Database error during registration: ' . $e->getMessage());
    error_log('Error code: ' . $e->getCode());
    error_log('Error info: ' . json_encode($e->errorInfo ?? []));
    http_response_code(500);
    echo json_encode([
        'error' => 'Registration failed due to database error',
        'details' => 'Please try again later or contact support'
    ]);
} catch (\RuntimeException $e) {
    // Rollback transaction on error if transaction is active
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Runtime error during registration: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Registration failed',
        'details' => $e->getMessage()
    ]);
} catch (\Exception $e) {
    // Rollback transaction on error if transaction is active
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Unexpected error during registration: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Unexpected registration error',
        'details' => 'Please try again or contact support'
    ]);
}
