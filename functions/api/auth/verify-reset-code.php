<?php

/**
 * Verify Reset Code
 * Handles verification of password reset codes
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';

use App\Services\AppwriteService;

// Get input data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['email']) || empty($data['code'])) {
    json_response(400, ['error' => 'Email and code are required']);
    exit;
}

$email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
$code = trim($data['code']);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(400, ['error' => 'Invalid email format']);
    exit;
}

if (!preg_match('/^\d{6}$/', $code)) {
    json_response(400, ['error' => 'Invalid code format']);
    exit;
}

try {
    $appwrite = new AppwriteService();
    $database = $appwrite->getDatabases();
    
    // Find the reset request
    $requests = $database->listDocuments(
        'haven_space',
        'password_reset_requests',
        [
            'queries' => [
                'equal("email", ["' . $email . '"])',
                'equal("reset_code", ["' . $code . '"])',
                'equal("is_used", [false])',
                'limit(1)'
            ]
        ]
    );
    
    if ($requests['total'] === 0) {
        json_response(404, ['error' => 'Invalid or expired reset code']);
        exit;
    }
    
    $request = $requests['documents'][0];
    
    // Check if code has expired
    if ($request['expires_at'] < time()) {
        json_response(400, ['error' => 'Reset code has expired']);
        exit;
    }
    
    // Check attempts
    if ($request['attempts'] >= 5) {
        json_response(400, ['error' => 'Too many attempts. Please request a new code']);
        exit;
    }
    
    // Update attempts
    $database->updateDocument(
        'haven_space',
        'password_reset_requests',
        $request['$id'],
        [
            'attempts' => $request['attempts'] + 1
        ]
    );
    
    json_response(200, [
        'message' => 'Reset code verified successfully',
        'valid' => true,
        'user_id' => $request['user_id'],
        'request_id' => $request['$id']
    ]);
    
} catch (Exception $e) {
    json_response(500, ['error' => 'Failed to verify reset code']);
}
