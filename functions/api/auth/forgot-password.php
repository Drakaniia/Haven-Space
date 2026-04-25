<?php

/**
 * Forgot Password - Send Reset Code
 * Handles sending password reset codes to users
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';

use App\Services\AppwriteService;

// Get input data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['email'])) {
    json_response(400, ['error' => 'Email is required']);
    exit;
}

$email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(400, ['error' => 'Invalid email format']);
    exit;
}

try {
    $appwrite = new AppwriteService();
    
    // Check if user exists
    $users = $appwrite->getAccount()->list([
        'queries' => [
            'equal("email", ["' . $email . '"])'
        ]
    ]);
    
    if ($users['total'] === 0) {
        // Don't reveal whether email exists for security
        json_response(200, ['message' => 'If this email exists, a reset code has been sent']);
        exit;
    }
    
    $user = $users['users'][0];
    
    // Check if this is a Google OAuth user (no password to reset)
    if (!empty($user['google_id'] ?? null)) {
        // Google OAuth user - provide alternative recovery options
        json_response(200, [
            'message' => 'Google account detected',
            'is_google_user' => true,
            'recovery_options' => [
                'google_account_recovery' => 'https://accounts.google.com/recovery',
                'contact_support' => 'mailto:support@haven-space.com'
            ]
        ]);
        exit;
    }
    
    // Generate a 6-digit reset code
    $resetCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = time() + (15 * 60); // 15 minutes from now
    
    // Store the reset code in database
    $database = $appwrite->getDatabases();
    
    // Check if there's an existing reset request for this user
    $existingRequests = $database->listDocuments(
        'haven_space',
        'password_reset_requests',
        [
            'queries' => [
                'equal("user_id", ["' . $user['$id'] . '"])',
                'limit(1)'
            ]
        ]
    );
    
    $documentId = null;
    
    if ($existingRequests['total'] > 0) {
        // Update existing request
        $documentId = $existingRequests['documents'][0]['$id'];
        $database->updateDocument(
            'haven_space',
            'password_reset_requests',
            $documentId,
            [
                'reset_code' => $resetCode,
                'expires_at' => $expiresAt,
                'attempts' => 0,
                'is_used' => false
            ]
        );
    } else {
        // Create new reset request
        $newRequest = $database->createDocument(
            'haven_space',
            'password_reset_requests',
            ID::unique(),
            [
                'user_id' => $user['$id'],
                'email' => $email,
                'reset_code' => $resetCode,
                'expires_at' => $expiresAt,
                'attempts' => 0,
                'is_used' => false,
                'created_at' => time()
            ]
        );
        $documentId = $newRequest['$id'];
    }
    
    // TODO: Send email with reset code
    // This would integrate with your email service
    // For now, we'll return the code in the response for testing
    
    json_response(200, [
        'message' => 'Reset code has been sent to your email',
        'reset_code' => $resetCode, // In production, remove this and send via email
        'request_id' => $documentId
    ]);
    
} catch (Exception $e) {
    json_response(500, ['error' => 'Failed to process password reset request']);
}
