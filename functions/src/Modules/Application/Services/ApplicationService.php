<?php

namespace App\Modules\Application\Services;

use App\Modules\Application\Repositories\ApplicationRepository;
use App\Modules\Notification\Services\NotificationService;
use App\Modules\Onboarding\Helpers\OnboardingTrigger;
use App\Modules\Payment\Services\PaymentService;

/**
 * Application Service
 * Business logic for rental applications
 */
class ApplicationService
{
    private ApplicationRepository $repository;
    private NotificationService $notificationService;
    private PaymentService $paymentService;

    public function __construct()
    {
        $this->repository = new ApplicationRepository();
        $this->notificationService = new NotificationService();
        $this->paymentService = new PaymentService();
    }

    /**
     * Get all applications for current user
     */
    public function getUserApplications(int $userId, string $role): array
    {
        if ($role === 'boarder') {
            return $this->repository->findByBoarder($userId);
        } else {
            return $this->repository->findByLandlord($userId);
        }
    }

    /**
     * Get a single application with details
     */
    public function getApplication(int $id, int $userId, string $role): ?array
    {
        $application = $this->repository->findById($id);

        if (!$application) {
            return null;
        }

        // Verify ownership
        if ($role === 'boarder' && $application['boarder_id'] !== $userId) {
            return null;
        }
        if ($role === 'landlord' && $application['landlord_id'] !== $userId) {
            return null;
        }

        return $application;
    }

    /**
     * Create a new application
     */
    public function createApplication(array $data, int $boarderId): array
    {
        // Validate required fields
        $required = ['room_id', 'landlord_id', 'message'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                error_log("Missing required field: $field. Data: " . json_encode($data));
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        $data['boarder_id'] = $boarderId;
        $data['status'] = 'pending';

        try {
            $id = $this->repository->create($data);
            error_log("Application created successfully with ID: $id");
            
            // Get the created application with full details for notification
            $fullApplication = $this->repository->findById($id);
            
            // Send notification to landlord about new application
            if ($fullApplication) {
                $this->notifyLandlordOfNewApplication($fullApplication);
            }
            
            // Return application details for the boarder
            return $this->getApplication($id, $boarderId, 'boarder');
        } catch (\Exception $e) {
            error_log("Error creating application: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            throw $e;
        }
    }

    /**
     * Send notification to landlord about new application
     */
    private function notifyLandlordOfNewApplication(array $application): void
    {
        try {
            // Get property details for property name
            $propertyDetails = $this->repository->getPropertyDetails($application['room_id']);
            
            if (!$propertyDetails) {
                error_log("Could not find property details for room {$application['room_id']}");
                return;
            }

            $propertyName = $propertyDetails['house_name'] ?? 'your property';
            $boarderName = trim(($application['boarder_first_name'] ?? '') . ' ' . ($application['boarder_last_name'] ?? '')) ?: 'A boarder';

            // Create notification for the landlord
            $this->notificationService->notifyNewApplication(
                $application['landlord_id'],
                $application['boarder_id'],
                $application['id'],
                $application['property_id'] ?? 0,
                $application['room_id'],
                $propertyName,
                $application['room_title'] ?? 'a room',
                $boarderName
            );

            error_log("New application notification sent to landlord {$application['landlord_id']} for application {$application['id']}");
        } catch (\Exception $e) {
            // Log error but don't fail the application creation
            error_log("Failed to send new application notification for application {$application['id']}: " . $e->getMessage());
        }
    }

    /**
     * Update application status (landlord only)
     * Triggers onboarding flow when application is accepted
     */
    public function updateStatus(int $applicationId, string $status, int $landlordId): array
    {
        $validStatuses = ['pending', 'accepted', 'rejected', 'cancelled'];
        if (!in_array($status, $validStatuses)) {
            throw new \InvalidArgumentException("Invalid status: $status");
        }

        $application = $this->repository->findById($applicationId);
        if (!$application) {
            throw new \RuntimeException('Application not found');
        }

        if ($application['landlord_id'] !== $landlordId) {
            throw new \RuntimeException('Unauthorized');
        }

        // Prevent status change if already accepted or rejected
        if (in_array($application['status'], ['accepted', 'rejected'])) {
            throw new \RuntimeException('Application has already been processed');
        }

        $this->repository->update($applicationId, ['status' => $status]);

        // Trigger onboarding flow when application is accepted
        if ($status === 'accepted') {
            $this->triggerOnboardingForAcceptedApplication($application);
        }

        return $this->getApplication($applicationId, $landlordId, 'landlord');
    }

    /**
     * Trigger onboarding flow for accepted application
     */
    private function triggerOnboardingForAcceptedApplication(array $application): void
    {
        try {
            // Get property details for house name
            $propertyDetails = $this->repository->getPropertyDetails($application['room_id']);

            if (!$propertyDetails) {
                error_log("Could not find property details for room {$application['room_id']}");
                return;
            }

            $houseName = $propertyDetails['house_name'] ?? 'our boarding house';

            // Create notification for the boarder
            $this->notificationService->notifyApplicationAccepted(
                $application['boarder_id'],
                $application['landlord_id'],
                $application['id'],
                $application['property_id'] ?? 0,
                $application['room_id'],
                $houseName,
                $application['room_title'] ?? 'a room',
                $application['room_price'] ?? 0
            );

            // Trigger the welcome flow
            OnboardingTrigger::onApplicationAccepted(
                $application['boarder_id'],
                $application['landlord_id'],
                $application['property_id'] ?? 0,
                $houseName
            );

            // Create initial payment for the boarder
            $this->paymentService->createInitialPayment(
                $application['boarder_id'],
                $application['landlord_id'],
                $application['room_id'],
                $application['property_id'] ?? 0,
                $application['room_price'] ?? 0
            );

            error_log("Onboarding and payment triggered for application {$application['id']}");
        } catch (\Exception $e) {
            // Log error but don't fail the status update
            error_log("Failed to trigger onboarding for application {$application['id']}: " . $e->getMessage());
        }
    }

    /**
     * Delete an application
     */
    public function deleteApplication(int $applicationId, int $userId): bool
    {
        $application = $this->repository->findById($applicationId);
        if (!$application) {
            throw new \RuntimeException('Application not found');
        }

        if ($application['boarder_id'] !== $userId) {
            throw new \RuntimeException('Unauthorized');
        }

        return $this->repository->delete($applicationId);
    }
}
