<?php
/**
 * Payment Methods API
 * GET /api/payments/methods - Get saved payment methods for current user
 * POST /api/payments/methods - Add a new payment method
 * DELETE /api/payments/methods/:id - Remove a payment method
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Authenticate user
$user = Middleware::authenticate();
$userId = $user['user_id'];

$method = $_SERVER['REQUEST_METHOD'];

// GET - Get payment methods
if ($method === 'GET') {
    try {
        $pdo = Connection::getInstance()->getPdo();
        
        // For now, return mock payment methods
        // In a real implementation, these would be stored in a payment_methods table
        $mockMethods = [
            [
                'id' => 1,
                'type' => 'gcash',
                'name' => 'GCash',
                'last_four' => '4582',
                'is_default' => true,
                'icon' => 'phone'
            ],
            [
                'id' => 2,
                'type' => 'bank',
                'name' => 'BDO Bank Transfer',
                'last_four' => '7891',
                'is_default' => false,
                'icon' => 'building'
            ],
            [
                'id' => 3,
                'type' => 'card',
                'name' => 'Visa Credit Card',
                'last_four' => '3254',
                'is_default' => false,
                'icon' => 'creditCard'
            ]
        ];

        json_response(200, [
            'success' => true,
            'data' => $mockMethods
        ]);

    } catch (Exception $e) {
        error_log('Get payment methods error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to load payment methods']);
    }
}

// POST - Add payment method
if ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validate input
        if (!isset($input['type']) || !isset($input['name'])) {
            json_response(400, ['error' => 'Missing required fields']);
        }

        // In a real implementation, save to database
        // For now, return success
        json_response(201, [
            'success' => true,
            'message' => 'Payment method added successfully',
            'data' => [
                'id' => rand(100, 999),
                'type' => $input['type'],
                'name' => $input['name'],
                'last_four' => $input['last_four'] ?? '0000',
                'is_default' => $input['is_default'] ?? false
            ]
        ]);

    } catch (Exception $e) {
        error_log('Add payment method error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to add payment method']);
    }
}

// DELETE - Remove payment method
if ($method === 'DELETE') {
    try {
        // Get ID from URL path
        $pathParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
        $methodId = end($pathParts);

        if (!is_numeric($methodId)) {
            json_response(400, ['error' => 'Invalid payment method ID']);
        }

        // In a real implementation, delete from database
        // For now, return success
        json_response(200, [
            'success' => true,
            'message' => 'Payment method removed successfully'
        ]);

    } catch (Exception $e) {
        error_log('Delete payment method error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to remove payment method']);
    }
}

// Method not allowed
json_response(405, ['error' => 'Method not allowed']);
