<?php
/**
 * Get Pending Google OAuth User Data
 * 
 * Returns the pending Google user data stored in session during OAuth flow.
 * This is used when a user signs up with Google but hasn't selected a role yet.
 */

require_once __DIR__ . '/../../cors.php';
require_once __DIR__ . '/../../../src/Core/bootstrap.php';

header('Content-Type: application/json');

$pendingUser = $_SESSION['pending_google_user'] ?? null;

if ($pendingUser) {
    echo json_encode([
        'success' => true,
        'data' => [
            'first_name' => $pendingUser['first_name'],
            'last_name' => $pendingUser['last_name'],
            'email' => $pendingUser['email'],
            'avatar_url' => $pendingUser['avatar_url'],
        ],
    ]);
} else {
    echo json_encode([
        'success' => false,
        'data' => null,
    ]);
}
