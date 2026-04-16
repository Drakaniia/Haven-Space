<?php

/**
 * Landlord Payments API
 * 
 * GET /api/landlord/payments.php - Get all payments with optional filters
 * GET /api/landlord/payments.php?id={id} - Get single payment
 * POST /api/landlord/payments.php - Record a payment
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Modules\Payment\Services\PaymentService;

$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

$paymentService = new PaymentService();

// GET - Fetch payments
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Single payment
        if (isset($_GET['id'])) {
            $paymentId = intval($_GET['id']);
            $payment = $paymentService->getPayment($paymentId, $landlordId);

            if (!$payment) {
                json_response(404, ['error' => 'Payment not found']);
            }

            json_response(200, ['data' => $payment]);
        }

        // All payments with optional filters
        $filters = [];
        if (isset($_GET['status'])) {
            $filters['status'] = $_GET['status'];
        }
        if (isset($_GET['property_id'])) {
            $filters['property_id'] = intval($_GET['property_id']);
        }

        $payments = $paymentService->getLandlordPayments($landlordId, $filters);

        json_response(200, ['data' => $payments]);
    } catch (Exception $e) {
        error_log('Error fetching payments: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to fetch payments']);
    }
}

// POST - Record a payment
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['payment_id'])) {
            json_response(400, ['error' => 'Payment ID is required']);
        }

        $paymentId = intval($input['payment_id']);
        $paymentData = [
            'paid_date' => $input['paid_date'] ?? date('Y-m-d'),
            'payment_method' => $input['payment_method'] ?? null,
            'reference_number' => $input['reference_number'] ?? null,
            'notes' => $input['notes'] ?? null,
        ];

        $updatedPayment = $paymentService->recordPayment($paymentId, $landlordId, $paymentData);

        json_response(200, [
            'success' => true,
            'message' => 'Payment recorded successfully',
            'data' => $updatedPayment,
        ]);
    } catch (\RuntimeException $e) {
        json_response(400, ['error' => $e->getMessage()]);
    } catch (Exception $e) {
        error_log('Error recording payment: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to record payment']);
    }
}

json_response(405, ['error' => 'Method not allowed']);
