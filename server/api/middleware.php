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
        // Simulation bypass for development/testing
        $simulatedId = $_SERVER['HTTP_X_USER_ID'] ?? $_GET['user_id'] ?? null;
        if ($simulatedId) {
            $userId = (int) $simulatedId;
            $pdo = Connection::getInstance()->getPdo();
            $stmt = $pdo->prepare('
                SELECT u.id, ur.role_name as role, u.is_verified, u.email_verified, 
                       acs.status_name as account_status, vr.verification_status_id,
                       vs.status_name as verification_status
                FROM users u
                JOIN user_roles ur ON u.role_id = ur.id
                JOIN account_statuses acs ON u.account_status_id = acs.id
                LEFT JOIN verification_records vr ON vr.entity_type = "user" AND vr.entity_id = u.id
                LEFT JOIN verification_statuses vs ON vr.verification_status_id = vs.id
                WHERE u.id = ? AND u.deleted_at IS NULL
            ');
            $stmt->execute([$userId]);
            $row = $stmt->fetch();
            
            if ($row) {
                if (($row['account_status'] ?? 'active') !== 'active') {
                    http_response_code(403);
                    echo json_encode(['error' => 'Account is suspended or banned']);
                    exit;
                }
                return [
                    'user_id' => (int)$row['id'],
                    'role' => $row['role'],
                    'is_verified' => (bool)$row['is_verified'],
                    'email_verified' => (bool)$row['email_verified'],
                    'account_status' => $row['account_status'],
                    'verification_status' => $row['verification_status']
                ];
            }
        }

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
            $stmt = $pdo->prepare('
                SELECT acs.status_name as account_status, u.email_verified, 
                       vs.status_name as verification_status
                FROM users u
                JOIN account_statuses acs ON u.account_status_id = acs.id
                LEFT JOIN verification_records vr ON vr.entity_type = "user" AND vr.entity_id = u.id
                LEFT JOIN verification_statuses vs ON vr.verification_status_id = vs.id
                WHERE u.id = ? AND u.deleted_at IS NULL
            ');
            $stmt->execute([$userId]);
            $row = $stmt->fetch();
            
            if (!$row) {
                http_response_code(401);
                echo json_encode(['error' => 'User not found']);
                exit;
            }
            
            $accountStatus = $row['account_status'] ?? 'active';
            if (in_array($accountStatus, ['suspended', 'banned'])) {
                http_response_code(403);
                echo json_encode(['error' => 'Account is suspended or banned']);
                exit;
            }
            
            // Add verification status to payload
            $payload['email_verified'] = (bool)$row['email_verified'];
            $payload['account_status'] = $accountStatus;
            $payload['verification_status'] = $row['verification_status'];
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

        // Check email verification first
        if (!($user['email_verified'] ?? false)) {
            http_response_code(403);
            echo json_encode([
                'error' => 'Email verification required',
                'code' => 'EMAIL_NOT_VERIFIED',
                'message' => 'Please verify your email address before accessing landlord features.'
            ]);
            exit;
        }

        // For write operations, check full verification status
        if (in_array($method, $writeMethods)) {
            $accountStatus = $user['account_status'] ?? 'active';
            $verificationStatus = $user['verification_status'] ?? null;
            
            if ($accountStatus === 'pending_verification' || $verificationStatus === 'pending') {
                http_response_code(403);
                echo json_encode([
                    'error' => 'Account verification pending',
                    'code' => 'VERIFICATION_PENDING',
                    'message' => 'Your account is under review. You have read-only access until verification is complete.'
                ]);
                exit;
            }
            
            if ($verificationStatus === 'rejected') {
                http_response_code(403);
                echo json_encode([
                    'error' => 'Account verification rejected',
                    'code' => 'VERIFICATION_REJECTED',
                    'message' => 'Your account verification was rejected. Please review the feedback and resubmit required documents.'
                ]);
                exit;
            }
            
            if (!($user['is_verified'] ?? false) && $verificationStatus !== 'approved') {
                http_response_code(403);
                echo json_encode([
                    'error' => 'Account verification required',
                    'code' => 'VERIFICATION_REQUIRED',
                    'message' => 'Your account is pending verification. Write operations are not allowed until an admin approves your account.'
                ]);
                exit;
            }
        }

        return $user;
    }

    /**
     * Authorize verified boarder for critical actions (like applying to rooms)
     */
    public static function authorizeVerifiedBoarder()
    {
        $user = self::authorize(['boarder']);
        
        // Check email verification for critical actions
        if (!($user['email_verified'] ?? false)) {
            http_response_code(403);
            echo json_encode([
                'error' => 'Email verification required',
                'code' => 'EMAIL_NOT_VERIFIED',
                'message' => 'Please verify your email address before applying to rooms.'
            ]);
            exit;
        }
        
        return $user;
    }
}
