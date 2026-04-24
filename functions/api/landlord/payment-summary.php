<?php

/**
 * Landlord Payment Summary API
 * GET /api/landlord/payment-summary.php
 * 
 * Returns payment statistics:
 * - Paid on time this month
 * - Due within 7 days
 * - Overdue payments
 * - Total revenue this month
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Modules\Payment\Services\PaymentService;

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

try {
    $paymentService = new PaymentService();
    $summary = $paymentService->getPaymentSummary($landlordId);

    json_response(200, ['data' => $summary]);
} catch (Exception $e) {
    error_log('Error fetching payment summary: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to fetch payment summary']);
}
