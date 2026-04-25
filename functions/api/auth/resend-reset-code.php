<?php

/**
 * Resend Reset Code
 * Handles resending password reset codes
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
    $database = $appwrite->getDatabases();
    
    // Find existing reset request
    $existingRequests = $database->listDocuments(
        'haven_space',
        'password_reset_requests',
        [
            'queries' => [
                'equal("email", ["' . $email . '"])',
                'equal("is_used", [false])',
                'limit(1)'
            ]
        ]
    );
    
    if ($existingRequests['total'] === 0) {
        // No existing request, create a new one
        // Check if user exists first
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
        
        // Generate a new reset code
        $resetCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = time() + (15 * 60); // 15 minutes from now
        
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
    } else {
        // Update existing request with new code
        $request = $existingRequests['documents'][0];
        
        // Generate a new reset code
        $resetCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = time() + (15 * 60); // 15 minutes from now
        
        $database->updateDocument(
            'haven_space',
            'password_reset_requests',
            $request['$id'],
            [
                'reset_code' => $resetCode,
                'expires_at' => $expiresAt,
                'attempts' => 0
            ]
        );
        
        $documentId = $request['$id'];
    }
    
    // TODO: Send email with new reset code
    // This would integrate with your email service
    // For now, we'll return the code in the response for testing
    
    json_response(200, [
        'message' => 'A new reset code has been sent to your email',
        'reset_code' => $resetCode, // In production, remove this and send via email
        'request_id' => $documentId
    ]);
    
} catch (Exception $e) {
    json_response(500, ['error' => 'Failed to resend reset code']);
}
