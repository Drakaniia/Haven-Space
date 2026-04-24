<?php

namespace App\Modules\Payment\Services;

use App\Modules\Payment\Repositories\PaymentRepository;
use App\Core\Database\Connection;

/**
 * Payment Service
 * Business logic for payment management
 */
class PaymentService
{
    private PaymentRepository $repository;

    public function __construct()
    {
        $this->repository = new PaymentRepository();
    }

    /**
     * Create initial payment when application is accepted
     * 
     * @param int $boarderId
     * @param int $landlordId
     * @param int $roomId
     * @param int $propertyId
     * @param float $amount
     * @return int Payment ID
     */
    public function createInitialPayment(
        int $boarderId,
        int $landlordId,
        int $roomId,
        int $propertyId,
        float $amount
    ): int {
        // Set due date to 5th of next month
        $dueDate = date('Y-m-') . '05';
        if (date('d') >= 5) {
            $dueDate = date('Y-m-05', strtotime('+1 month'));
        }

        $paymentData = [
            'boarder_id' => $boarderId,
            'landlord_id' => $landlordId,
            'room_id' => $roomId,
            'property_id' => $propertyId,
            'amount' => $amount,
            'late_fee' => 0,
            'due_date' => $dueDate,
            'status' => 'pending',
        ];

        return $this->repository->create($paymentData);
    }

    /**
     * Get all payments for a landlord
     * 
     * @param int $landlordId
     * @param array $filters Optional filters (status, property_id)
     * @return array
     */
    public function getLandlordPayments(int $landlordId, array $filters = []): array
    {
        return $this->repository->findByLandlord($landlordId, $filters);
    }

    /**
     * Get payment summary statistics for landlord
     * 
     * @param int $landlordId
     * @return array
     */
    public function getPaymentSummary(int $landlordId): array
    {
        $today = date('Y-m-d');
        $sevenDaysFromNow = date('Y-m-d', strtotime('+7 days'));

        // Paid on time this month
        $paidOnTime = $this->repository->countPaidOnTime($landlordId);

        // Due within 7 days
        $dueSoon = $this->repository->countDueSoon($landlordId, $today, $sevenDaysFromNow);

        // Overdue
        $overdue = $this->repository->countOverdue($landlordId, $today);

        // Total revenue this month
        $totalRevenue = $this->repository->getTotalRevenueThisMonth($landlordId);

        return [
            'paid_on_time' => $paidOnTime,
            'due_soon' => $dueSoon,
            'overdue' => $overdue,
            'total_revenue' => $totalRevenue,
        ];
    }

    /**
     * Record a payment
     * 
     * @param int $paymentId
     * @param int $landlordId
     * @param array $data Payment details (paid_date, payment_method, reference_number, notes)
     * @return array Updated payment
     */
    public function recordPayment(int $paymentId, int $landlordId, array $data): array
    {
        $payment = $this->repository->findById($paymentId);

        if (!$payment) {
            throw new \RuntimeException('Payment not found');
        }

        if ($payment['landlord_id'] !== $landlordId) {
            throw new \RuntimeException('Unauthorized');
        }

        if ($payment['status'] === 'paid') {
            throw new \RuntimeException('Payment already recorded');
        }

        $updateData = [
            'status' => 'paid',
            'paid_date' => $data['paid_date'] ?? date('Y-m-d'),
            'payment_method' => $data['payment_method'] ?? null,
            'reference_number' => $data['reference_number'] ?? null,
            'notes' => $data['notes'] ?? null,
        ];

        $this->repository->update($paymentId, $updateData);

        // Create next month's payment automatically
        $this->createNextMonthPayment($payment);

        return $this->repository->findById($paymentId);
    }

    /**
     * Create next month's payment automatically
     * 
     * @param array $currentPayment
     * @return int|null New payment ID or null if failed
     */
    private function createNextMonthPayment(array $currentPayment): ?int
    {
        try {
            // Calculate next month's due date
            $currentDueDate = new \DateTime($currentPayment['due_date']);
            $nextDueDate = $currentDueDate->modify('+1 month')->format('Y-m-d');

            // Check if next month's payment already exists
            $existingPayment = $this->repository->findByBoarderAndDueDate(
                $currentPayment['boarder_id'],
                $nextDueDate
            );

            if ($existingPayment) {
                return null; // Already exists
            }

            $nextPaymentData = [
                'boarder_id' => $currentPayment['boarder_id'],
                'landlord_id' => $currentPayment['landlord_id'],
                'room_id' => $currentPayment['room_id'],
                'property_id' => $currentPayment['property_id'],
                'amount' => $currentPayment['amount'],
                'late_fee' => 0,
                'due_date' => $nextDueDate,
                'status' => 'pending',
            ];

            return $this->repository->create($nextPaymentData);
        } catch (\Exception $e) {
            error_log('Failed to create next month payment: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Update overdue payments status
     * This should be called by a cron job daily
     * 
     * @return int Number of payments marked as overdue
     */
    public function updateOverduePayments(): int
    {
        $today = date('Y-m-d');
        return $this->repository->markOverdue($today);
    }

    /**
     * Get payment by ID
     * 
     * @param int $paymentId
     * @param int $landlordId
     * @return array|null
     */
    public function getPayment(int $paymentId, int $landlordId): ?array
    {
        $payment = $this->repository->findById($paymentId);

        if (!$payment || $payment['landlord_id'] !== $landlordId) {
            return null;
        }

        return $payment;
    }
}
