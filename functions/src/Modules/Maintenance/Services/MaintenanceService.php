<?php

namespace App\Modules\Maintenance\Services;

use App\Modules\Maintenance\Repositories\MaintenanceRepository;
use App\Modules\Notification\Services\NotificationService;

/**
 * Maintenance Service
 * Business logic for maintenance requests
 */
class MaintenanceService
{
    private MaintenanceRepository $repository;
    private NotificationService $notificationService;

    public function __construct()
    {
        $this->repository = new MaintenanceRepository();
        $this->notificationService = new NotificationService();
    }

    /**
     * Get all maintenance requests for current user
     */
    public function getUserMaintenanceRequests(int $userId, string $role): array
    {
        if ($role === 'boarder') {
            return $this->repository->findByBoarder($userId);
        } else {
            return $this->repository->findByLandlord($userId);
        }
    }

    /**
     * Get a single maintenance request with details
     */
    public function getMaintenanceRequest(int $id, int $userId, string $role): ?array
    {
        $maintenanceRequest = $this->repository->findById($id);

        if (!$maintenanceRequest) {
            return null;
        }

        // Verify ownership
        if ($role === 'boarder' && $maintenanceRequest['boarder_id'] !== $userId) {
            return null;
        }
        if ($role === 'landlord' && $maintenanceRequest['landlord_id'] !== $userId) {
            return null;
        }

        return $maintenanceRequest;
    }

    /**
     * Create a new maintenance request
     */
    public function createMaintenanceRequest(array $data, int $boarderId): array
    {
        // Validate required fields
        $required = ['room_id', 'landlord_id', 'title', 'description'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        $data['boarder_id'] = $boarderId;
        $data['status'] = 'pending';
        $data['priority'] = $data['priority'] ?? 'medium';

        $id = $this->repository->create($data);

        // Notify landlord about new maintenance request
        try {
            $this->notificationService->notifyMaintenanceRequest(
                $data['landlord_id'],
                $boarderId,
                $id,
                $data['title']
            );
        } catch (\Exception $e) {
            error_log("Failed to send maintenance notification: " . $e->getMessage());
        }

        return $this->getMaintenanceRequest($id, $boarderId, 'boarder');
    }

    /**
     * Update maintenance request status (landlord only)
     */
    public function updateStatus(int $maintenanceId, string $status, int $landlordId): array
    {
        $validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
        if (!in_array($status, $validStatuses)) {
            throw new \InvalidArgumentException("Invalid status: $status");
        }

        $maintenanceRequest = $this->repository->findById($maintenanceId);
        if (!$maintenanceRequest) {
            throw new \RuntimeException('Maintenance request not found');
        }

        if ($maintenanceRequest['landlord_id'] !== $landlordId) {
            throw new \RuntimeException('Unauthorized');
        }

        $updateData = ['status' => $status];
        if ($status === 'completed') {
            $updateData['completed_at'] = date('Y-m-d H:i:s');
        }

        $this->repository->update($maintenanceId, $updateData);

        // Notify boarder about status change
        try {
            $this->notificationService->notifyMaintenanceStatusChange(
                $maintenanceRequest['boarder_id'],
                $landlordId,
                $maintenanceId,
                $status,
                $maintenanceRequest['title']
            );
        } catch (\Exception $e) {
            error_log("Failed to send status change notification: " . $e->getMessage());
        }

        return $this->getMaintenanceRequest($maintenanceId, $landlordId, 'landlord');
    }

    /**
     * Bulk update maintenance request statuses (landlord only)
     */
    public function bulkUpdateStatus(array $ids, string $status, int $landlordId): array
    {
        $validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
        if (!in_array($status, $validStatuses)) {
            throw new \InvalidArgumentException("Invalid status: $status");
        }

        $updated = [];
        $failed = [];

        foreach ($ids as $id) {
            try {
                $result = $this->updateStatus((int) $id, $status, $landlordId);
                $updated[] = $result;
            } catch (\Exception $e) {
                $failed[] = ['id' => $id, 'error' => $e->getMessage()];
            }
        }

        return [
            'updated' => $updated,
            'failed' => $failed,
            'total' => count($ids),
            'success_count' => count($updated),
            'failed_count' => count($failed),
        ];
    }

    /**
     * Add a comment to a maintenance request
     */
    public function addComment(int $maintenanceId, string $comment, int $userId, string $role): array
    {
        $maintenanceRequest = $this->repository->findById($maintenanceId);
        if (!$maintenanceRequest) {
            throw new \RuntimeException('Maintenance request not found');
        }

        // Verify user has access to this maintenance request
        if ($role === 'boarder' && $maintenanceRequest['boarder_id'] !== $userId) {
            throw new \RuntimeException('Unauthorized');
        }
        if ($role === 'landlord' && $maintenanceRequest['landlord_id'] !== $userId) {
            throw new \RuntimeException('Unauthorized');
        }

        // For now, store comment in a simple format
        // In a production system, you'd want a separate comments table
        $commentData = [
            'user_id' => $userId,
            'role' => $role,
            'comment' => $comment,
            'timestamp' => date('Y-m-d H:i:s'),
        ];

        return $commentData;
    }

    /**
     * Rate a completed maintenance request (boarder only)
     */
    public function rateRequest(int $maintenanceId, int $rating, int $boarderId): array
    {
        if ($rating < 1 || $rating > 5) {
            throw new \InvalidArgumentException('Rating must be between 1 and 5');
        }

        $maintenanceRequest = $this->repository->findById($maintenanceId);
        if (!$maintenanceRequest) {
            throw new \RuntimeException('Maintenance request not found');
        }

        if ($maintenanceRequest['boarder_id'] !== $boarderId) {
            throw new \RuntimeException('Unauthorized');
        }

        if ($maintenanceRequest['status'] !== 'completed') {
            throw new \RuntimeException('Can only rate completed maintenance requests');
        }

        // For now, return the rating
        // In a production system, you'd want to store this in the database
        return [
            'maintenance_id' => $maintenanceId,
            'rating' => $rating,
            'rated_at' => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * Assign a contractor to a maintenance request (landlord only)
     */
    public function assignContractor(int $maintenanceId, string $contractorName, int $landlordId): array
    {
        $maintenanceRequest = $this->repository->findById($maintenanceId);
        if (!$maintenanceRequest) {
            throw new \RuntimeException('Maintenance request not found');
        }

        if ($maintenanceRequest['landlord_id'] !== $landlordId) {
            throw new \RuntimeException('Unauthorized');
        }

        // For now, return the assignment
        // In a production system, you'd want to store this in the database
        return [
            'maintenance_id' => $maintenanceId,
            'contractor_name' => $contractorName,
            'assigned_at' => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * Delete a maintenance request
     */
    public function deleteMaintenanceRequest(int $maintenanceId, int $landlordId): bool
    {
        $maintenanceRequest = $this->repository->findById($maintenanceId);
        if (!$maintenanceRequest) {
            throw new \RuntimeException('Maintenance request not found');
        }

        if ($maintenanceRequest['landlord_id'] !== $landlordId) {
            throw new \RuntimeException('Unauthorized');
        }

        return $this->repository->delete($maintenanceId);
    }

    /**
     * Get maintenance statistics
     */
    public function getStats(int $userId, string $role): array
    {
        if ($role === 'boarder') {
            return $this->repository->getBoarderStats($userId);
        } else {
            return $this->repository->getLandlordStats($userId);
        }
    }
}
