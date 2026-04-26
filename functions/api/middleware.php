<?php

namespace App\Api;

require_once __DIR__ . '/../src/Core/Auth/JWT.php';
require_once __DIR__ . '/../src/Core/Database/Connection.php';

use App\Core\Auth\JWT;
use App\Core\Database\Connection;

/**
 * Helper to send a JSON response and stop execution.
 * In Appwrite function context, throws ResponseSentException instead of exit().
 */
function _respond(int $code, array $data): void
{
    http_response_code($code);
    $body = json_encode($data);
    echo $body;
    if (defined('APPWRITE_FUNCTION_CONTEXT')) {
        throw new \ResponseSentException($code, $body);
    }
    exit;
}

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
                ORDER BY 
                    CASE vs.status_name
                        WHEN "approved" THEN 1
                        WHEN "pending" THEN 2
                        WHEN "rejected" THEN 3
                        ELSE 4
                    END,
                    vr.reviewed_at DESC,
                    vr.submitted_at DESC
                LIMIT 1
            ');
            $stmt->execute([$userId]);
            $row = $stmt->fetch();

            if ($row) {
                // Allow 'pending_verification' status for development/testing
                if (!in_array($row['account_status'] ?? 'active', ['active', 'pending_verification'])) {
                    _respond(403, ['error' => 'Account is suspended or banned']);
                }
                return [
                    'user_id' => (int)$row['id'],
                    'role' => $row['role'],
                    'is_verified' => (bool)$row['is_verified'],
                    'email_verified' => (bool)$row['email_verified'],
                    'account_status' => $row['account_status'],
                    'verification_status' => $row['verification_status'],
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
            _respond(401, ['error' => 'No token provided']);
        }

        $payload = JWT::validate($token);

        if (!$payload) {
            _respond(401, ['error' => 'Invalid or expired token']);
        }

        $userId = (int) ($payload['user_id'] ?? 0);
        if ($userId > 0) {
            $pdo = Connection::getInstance()->getPdo();
            $stmt = $pdo->prepare('
                SELECT acs.status_name as account_status, u.email_verified, 
                       vs.status_name as verification_status,
                       ur.role_name as role
                FROM users u
                JOIN account_statuses acs ON u.account_status_id = acs.id
                LEFT JOIN verification_records vr ON vr.entity_type = "user" AND vr.entity_id = u.id
                LEFT JOIN verification_statuses vs ON vr.verification_status_id = vs.id
                JOIN user_roles ur ON u.role_id = ur.id
                WHERE u.id = ? AND u.deleted_at IS NULL
                ORDER BY 
                    CASE vs.status_name
                        WHEN "approved" THEN 1
                        WHEN "pending" THEN 2
                        WHEN "rejected" THEN 3
                        ELSE 4
                    END,
                    vr.reviewed_at DESC,
                    vr.submitted_at DESC
                LIMIT 1
            ');
            $stmt->execute([$userId]);
            $row = $stmt->fetch();

            if (!$row) {
                _respond(401, ['error' => 'User not found']);
            }

            $accountStatus = $row['account_status'] ?? 'active';
            // Allow 'pending_verification' status for development/testing
            if (in_array($accountStatus, ['suspended', 'banned'])) {
                _respond(403, ['error' => 'Account is suspended or banned']);
            }

            $payload['email_verified'] = (bool)$row['email_verified'];
            $payload['account_status'] = $accountStatus;
            $payload['verification_status'] = $row['verification_status'];
            
            // Ensure role is always set, either from JWT or database
            if (empty($payload['role']) && !empty($row['role'])) {
                $payload['role'] = $row['role'];
            }
        }

        return $payload;
    }

    public static function authorize(array $allowedRoles)
    {
        $user = self::authenticate();

        // Ensure role is set, fallback to database lookup if missing
        if (empty($user['role']) && !empty($user['user_id'])) {
            $pdo = Connection::getInstance()->getPdo();
            $stmt = $pdo->prepare('SELECT ur.role_name as role FROM users u JOIN user_roles ur ON u.role_id = ur.id WHERE u.id = ?');
            $stmt->execute([$user['user_id']]);
            $roleRow = $stmt->fetch();
            if ($roleRow) {
                $user['role'] = $roleRow['role'];
            }
        }

        if (empty($user['role'])) {
            _respond(403, ['error' => 'Forbidden: User role not defined']);
        }

        if (!in_array($user['role'], $allowedRoles)) {
            _respond(403, ['error' => 'Forbidden: You do not have permission to access this resource']);
        }

        return $user;
    }

    /**
     * Require verified landlord for write operations.
     */
    public static function authorizeVerifiedLandlord()
    {
        $user = self::authorize(['landlord']);

        $method = $_SERVER['REQUEST_METHOD'];
        $writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

        if (!($user['email_verified'] ?? false)) {
            _respond(403, [
                'error' => 'Email verification required',
                'code' => 'EMAIL_NOT_VERIFIED',
                'message' => 'Please verify your email address before accessing landlord features.',
            ]);
        }

        if (in_array($method, $writeMethods)) {
            $accountStatus = $user['account_status'] ?? 'active';
            $verificationStatus = $user['verification_status'] ?? null;

            if ($accountStatus === 'pending_verification' || $verificationStatus === 'pending') {
                _respond(403, [
                    'error' => 'Account verification pending',
                    'code' => 'VERIFICATION_PENDING',
                    'message' => 'Your account is under review. You have read-only access until verification is complete.',
                ]);
            }

            if ($verificationStatus === 'rejected') {
                _respond(403, [
                    'error' => 'Account verification rejected',
                    'code' => 'VERIFICATION_REJECTED',
                    'message' => 'Your account verification was rejected. Please review the feedback and resubmit required documents.',
                ]);
            }

            if (!($user['is_verified'] ?? false) && $verificationStatus !== 'approved') {
                _respond(403, [
                    'error' => 'Account verification required',
                    'code' => 'VERIFICATION_REQUIRED',
                    'message' => 'Your account is pending verification. Write operations are not allowed until an admin approves your account.',
                ]);
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

        if (!($user['email_verified'] ?? false)) {
            _respond(403, [
                'error' => 'Email verification required',
                'code' => 'EMAIL_NOT_VERIFIED',
                'message' => 'Please verify your email address before applying to rooms.',
            ]);
        }

        return $user;
    }
}
