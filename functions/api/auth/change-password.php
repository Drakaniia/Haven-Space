<?php

/**
 * Change Password API
 * Allows authenticated users to change their password
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../middleware.php';

use App\Core\Database\Database;
use App\Api\Middleware;

$user = Middleware::authenticate();
if (!$user) {
    json_response(401, ['error' => 'Unauthorized']);
    return;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
    return;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['current_password']) || empty($data['new_password'])) {
    json_response(400, ['error' => 'Current password and new password are required']);
    return;
}

$currentPassword = $data['current_password'];
$newPassword = $data['new_password'];

if (strlen($newPassword) < 8) {
    json_response(400, ['error' => 'New password must be at least 8 characters']);
    return;
}

try {
    $db = Database::getInstance();

    // Fetch current password hash
    $stmt = $db->prepare('SELECT password_hash, google_id FROM users WHERE id = ? AND deleted_at IS NULL');
    $stmt->execute([$user['user_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        json_response(404, ['error' => 'User not found']);
        return;
    }

    // Google-only accounts have no password
    if (empty($row['password_hash']) && !empty($row['google_id'])) {
        json_response(400, ['error' => 'Google accounts cannot change password here']);
        return;
    }

    if (!password_verify($currentPassword, $row['password_hash'])) {
        json_response(401, ['error' => 'Current password is incorrect']);
        return;
    }

    $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
    $stmt = $db->prepare('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?');
    $stmt->execute([$newHash, $user['user_id']]);

    json_response(200, ['message' => 'Password updated successfully']);

} catch (Exception $e) {
    error_log('Error changing password: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to update password']);
}
