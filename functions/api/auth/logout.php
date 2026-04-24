<?php

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

use App\Core\Auth\JWT;

header('Content-Type: application/json');

// Clear authentication cookies
JWT::clearAuthCookies();

echo json_encode([
    'success' => true,
    'message' => 'Logged out successfully'
]);
