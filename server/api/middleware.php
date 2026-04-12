<?php

namespace App\Api;

require_once __DIR__ . '/../src/Core/Auth/JWT.php';
require_once __DIR__ . '/../src/Core/Database/Connection.php';

use App\Core\Auth\JWT;
use App\Core\Database\Connection;

class Middleware
{
    public static function authenticate()
    {
        $authHeader = '';
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        } elseif (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            if (isset($headers['Authorization'])) {
                $authHeader = $headers['Authorization'];
            }
        }
        
        $token = '';
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $token = $matches[1];
        }

        if (empty($token) && !empty($_COOKIE['access_token'])) {
            $token = $_COOKIE['access_token'];
        }

        if (empty($token)) {
            http_response_code(401);
            echo json_encode(['error' => 'No token provided']);
            exit;
        }

        $payload = JWT::validate($token);

        if (!$payload) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid or expired token']);
            exit;
        }

        $userId = (int) ($payload['user_id'] ?? 0);
        if ($userId > 0) {
            $pdo = Connection::getInstance()->getPdo();
            $stmt = $pdo->prepare('SELECT account_status FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $row = $stmt->fetch();
            if (!$row || ($row['account_status'] ?? 'active') !== 'active') {
                http_response_code(403);
                echo json_encode(['error' => 'Account is suspended or banned']);
                exit;
            }
        }

        return $payload;
    }

    public static function authorize(array $allowedRoles)
    {
        $user = self::authenticate();

        if (!in_array($user['role'], $allowedRoles)) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: You do not have permission to access this resource']);
            exit;
        }

        return $user;
    }

    /**
     * Require verified landlord for write operations.
     * GET requests are allowed (read-only access for pending landlords).
     * POST/PUT/PATCH/DELETE are blocked if the landlord is not verified.
     */
    public static function authorizeVerifiedLandlord()
    {
        $user = self::authorize(['landlord']);

        $method = $_SERVER['REQUEST_METHOD'];
        $writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

        if (in_array($method, $writeMethods) && empty($user['is_verified'])) {
            http_response_code(403);
            echo json_encode([
                'error' => 'Your account is pending verification. Write operations are not allowed until an admin approves your account.'
            ]);
            exit;
        }

        return $user;
    }
}
