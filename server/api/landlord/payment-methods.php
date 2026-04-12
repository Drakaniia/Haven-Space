<?php
/**
 * Landlord Payment Methods API
 * Handles adding, retrieving, updating, and deleting payment methods
 */

// Include centralized CORS configuration
require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

/**
 * POST /api/landlord/payment-methods.php
 * Add a new payment method for a landlord
 * 
 * Request Body:
 * {
 *   "userId": 123,
 *   "methodType": "GCash",
 *   "accountNumber": "09123456789",
 *   "accountName": "Juan Dela Cruz",
 *   "bankName": "BDO", // optional, only for bank transfers
 *   "isPrimary": true
 * }
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!isset($input['userId']) || !isset($input['methodType']) || 
        !isset($input['accountNumber']) || !isset($input['accountName'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required fields: userId, methodType, accountNumber, accountName'
        ]);
        exit;
    }

    $userId = intval($input['userId']);
    $methodType = $input['methodType'];
    $accountNumber = trim($input['accountNumber']);
    $accountName = trim($input['accountName']);
    $bankName = isset($input['bankName']) ? trim($input['bankName']) : null;
    $isPrimary = isset($input['isPrimary']) ? boolval($input['isPrimary']) : false;

    // Validate method type
    $validMethodTypes = ['GCash', 'PayMaya', 'Bank Transfer', 'PayPal', 'GrabPay', 'Other'];
    if (!in_array($methodType, $validMethodTypes)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid payment method type'
        ]);
        exit;
    }

    // Validate account number based on method type
    if ($methodType === 'GCash' || $methodType === 'PayMaya') {
        // Validate Philippine mobile number format
        $phoneRegex = '/^(\+63|0)?9\d{9}$/';
        if (!preg_match($phoneRegex, str_replace(' ', '', $accountNumber))) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Invalid mobile number format. Use: +63 9XX XXX XXXX'
            ]);
            exit;
        }
    }

    if ($methodType === 'Bank Transfer' && !$bankName) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Bank name is required for bank transfers'
        ]);
        exit;
    }

    try {
        $db = getDB();

        // Get landlord profile ID
        $stmt = $db->prepare("SELECT id FROM landlord_profiles WHERE user_id = ?");
        $stmt->execute([$userId]);
        $landlordProfile = $stmt->fetch();

        if (!$landlordProfile) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Landlord profile not found'
            ]);
            exit;
        }

        $landlordId = $landlordProfile['id'];

        // If this is set as primary, unset other primary methods
        if ($isPrimary) {
            $stmt = $db->prepare("
                UPDATE payment_methods 
                SET is_primary = 0 
                WHERE landlord_id = ?
            ");
            $stmt->execute([$landlordId]);
        }

        // Encrypt account number before storage (use application-level encryption in production)
        // For now, we'll store as-is. In production, use openssl_encrypt() or similar
        $encryptedAccountNumber = $accountNumber; // TODO: Implement encryption

        // Insert new payment method
        $stmt = $db->prepare("
            INSERT INTO payment_methods 
            (landlord_id, method_type, account_number, account_name, bank_name, is_primary, is_verified)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        ");
        $stmt->execute([
            $landlordId, $methodType, $encryptedAccountNumber, 
            $accountName, $bankName, $isPrimary
        ]);

        $paymentMethodId = $db->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $paymentMethodId,
                'methodType' => $methodType,
                'accountName' => $accountName,
                'accountNumberMasked' => maskAccountNumber($accountNumber),
                'bankName' => $bankName,
                'isPrimary' => $isPrimary,
                'isVerified' => false
            ]
        ]);
    } catch (PDOException $e) {
        error_log("Error saving payment method: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to save payment method. Please try again.'
        ]);
    }
    exit;
}

/**
 * GET /api/landlord/payment-methods.php?userId={userId}
 * Get all payment methods for a landlord
 */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['userId'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required parameter: userId'
        ]);
        exit;
    }

    $userId = intval($_GET['userId']);

    try {
        $db = getDB();

        $stmt = $db->prepare("
            SELECT pm.* 
            FROM payment_methods pm
            INNER JOIN landlord_profiles lp ON pm.landlord_id = lp.id
            WHERE lp.user_id = ?
            ORDER BY pm.is_primary DESC, pm.created_at DESC
        ");
        $stmt->execute([$userId]);
        $paymentMethods = $stmt->fetchAll();

        // Mask account numbers for security
        $methods = array_map(function($method) {
            return [
                'id' => $method['id'],
                'methodType' => $method['method_type'],
                'accountName' => $method['account_name'],
                'accountNumberMasked' => maskAccountNumber($method['account_number']),
                'bankName' => $method['bank_name'],
                'isPrimary' => boolval($method['is_primary']),
                'isVerified' => boolval($method['is_verified']),
                'createdAt' => $method['created_at']
            ];
        }, $paymentMethods);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $methods
        ]);
    } catch (PDOException $e) {
        error_log("Error fetching payment methods: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch payment methods. Please try again.'
        ]);
    }
    exit;
}

/**
 * PATCH /api/landlord/payment-methods.php
 * Update a payment method
 * 
 * Request Body:
 * {
 *   "userId": 123,
 *   "paymentMethodId": 456,
 *   "accountNumber": "new number",
 *   "accountName": "new name",
 *   "isPrimary": true
 * }
 */
if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['userId']) || !isset($input['paymentMethodId'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required fields: userId, paymentMethodId'
        ]);
        exit;
    }

    $userId = intval($input['userId']);
    $paymentMethodId = intval($input['paymentMethodId']);
    $accountNumber = isset($input['accountNumber']) ? trim($input['accountNumber']) : null;
    $accountName = isset($input['accountName']) ? trim($input['accountName']) : null;
    $isPrimary = isset($input['isPrimary']) ? boolval($input['isPrimary']) : null;

    try {
        $db = getDB();

        // Get landlord profile ID
        $stmt = $db->prepare("SELECT id FROM landlord_profiles WHERE user_id = ?");
        $stmt->execute([$userId]);
        $landlordProfile = $stmt->fetch();

        if (!$landlordProfile) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Landlord profile not found'
            ]);
            exit;
        }

        $landlordId = $landlordProfile['id'];

        // Verify payment method belongs to this landlord
        $stmt = $db->prepare("SELECT id FROM payment_methods WHERE id = ? AND landlord_id = ?");
        $stmt->execute([$paymentMethodId, $landlordId]);
        $paymentMethod = $stmt->fetch();

        if (!$paymentMethod) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Payment method not found'
            ]);
            exit;
        }

        // Build update query dynamically
        $updates = [];
        $params = [];

        if ($accountNumber !== null) {
            $updates[] = "account_number = ?";
            $params[] = $accountNumber; // TODO: Encrypt in production
        }

        if ($accountName !== null) {
            $updates[] = "account_name = ?";
            $params[] = $accountName;
        }

        if ($isPrimary !== null) {
            // If setting as primary, unset others first
            if ($isPrimary) {
                $stmt = $db->prepare("
                    UPDATE payment_methods 
                    SET is_primary = 0 
                    WHERE landlord_id = ? AND id != ?
                ");
                $stmt->execute([$landlordId, $paymentMethodId]);
            }

            $updates[] = "is_primary = ?";
            $params[] = $isPrimary ? 1 : 0;
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'No fields to update'
            ]);
            exit;
        }

        $params[] = $paymentMethodId;
        $sql = "UPDATE payment_methods SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Payment method updated successfully'
        ]);
    } catch (PDOException $e) {
        error_log("Error updating payment method: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to update payment method. Please try again.'
        ]);
    }
    exit;
}

/**
 * DELETE /api/landlord/payment-methods.php
 * Delete a payment method
 * 
 * Request Body:
 * {
 *   "userId": 123,
 *   "paymentMethodId": 456
 * }
 */
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['userId']) || !isset($input['paymentMethodId'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required fields: userId, paymentMethodId'
        ]);
        exit;
    }

    $userId = intval($input['userId']);
    $paymentMethodId = intval($input['paymentMethodId']);

    try {
        $db = getDB();

        // Get landlord profile ID
        $stmt = $db->prepare("SELECT id FROM landlord_profiles WHERE user_id = ?");
        $stmt->execute([$userId]);
        $landlordProfile = $stmt->fetch();

        if (!$landlordProfile) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Landlord profile not found'
            ]);
            exit;
        }

        $landlordId = $landlordProfile['id'];

        // Verify payment method belongs to this landlord
        $stmt = $db->prepare("SELECT id, is_primary FROM payment_methods WHERE id = ? AND landlord_id = ?");
        $stmt->execute([$paymentMethodId, $landlordId]);
        $paymentMethod = $stmt->fetch();

        if (!$paymentMethod) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Payment method not found'
            ]);
            exit;
        }

        // Don't allow deleting if it's the only payment method
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM payment_methods WHERE landlord_id = ?");
        $stmt->execute([$landlordId]);
        $count = $stmt->fetch()['count'];

        if ($count <= 1) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Cannot delete the only payment method. Add another one first.'
            ]);
            exit;
        }

        // If deleting primary, set another as primary
        if ($paymentMethod['is_primary']) {
            $stmt = $db->prepare("
                UPDATE payment_methods 
                SET is_primary = 1 
                WHERE landlord_id = ? AND id != ?
                LIMIT 1
            ");
            $stmt->execute([$landlordId, $paymentMethodId]);
        }

        // Delete payment method
        $stmt = $db->prepare("DELETE FROM payment_methods WHERE id = ? AND landlord_id = ?");
        $stmt->execute([$paymentMethodId, $landlordId]);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Payment method deleted successfully'
        ]);
    } catch (PDOException $e) {
        error_log("Error deleting payment method: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to delete payment method. Please try again.'
        ]);
    }
    exit;
}

/**
 * Helper function to mask account numbers for display
 */
function maskAccountNumber($accountNumber) {
    if (empty($accountNumber)) return '****';
    if (strlen($accountNumber) <= 4) return '****';
    return '**** ' . substr($accountNumber, -4);
}
