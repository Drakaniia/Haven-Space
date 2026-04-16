<?php

/**
 * Update Overdue Payments Cron Job
 * 
 * This script should be run daily to mark pending payments as overdue
 * when their due date has passed.
 * 
 * Usage: php server/scripts/update-overdue-payments.php
 * 
 * Cron schedule (daily at 1 AM):
 * 0 1 * * * cd /path/to/haven-space && php server/scripts/update-overdue-payments.php
 */

require_once __DIR__ . '/../src/Core/bootstrap.php';

use App\Modules\Payment\Services\PaymentService;

try {
    $paymentService = new PaymentService();
    $count = $paymentService->updateOverduePayments();

    echo "[" . date('Y-m-d H:i:s') . "] Updated $count payment(s) to overdue status\n";
    
    // Log to file
    $logFile = __DIR__ . '/../logs/cron.log';
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    file_put_contents(
        $logFile,
        "[" . date('Y-m-d H:i:s') . "] Updated $count payment(s) to overdue status\n",
        FILE_APPEND
    );
    
    exit(0);
} catch (Exception $e) {
    echo "[" . date('Y-m-d H:i:s') . "] Error: " . $e->getMessage() . "\n";
    
    // Log error
    $logFile = __DIR__ . '/../logs/cron.log';
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    file_put_contents(
        $logFile,
        "[" . date('Y-m-d H:i:s') . "] Error updating overdue payments: " . $e->getMessage() . "\n",
        FILE_APPEND
    );
    
    exit(1);
}
