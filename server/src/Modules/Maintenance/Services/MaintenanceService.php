<?php

namespace App\Modules\Maintenance\Services;

use App\Modules\Maintenance\Repositories\MaintenanceRepository;
use App\Modules\Maintenance\Entities\MaintenanceRequest;
use App\Modules\Maintenance\Entities\MaintenanceComment;
use App\Modules\Notification\Helpers\Notification;

/**
 * Maintenance Service
 * Business logic for maintenance operations
 */
class MaintenanceService
{
    private MaintenanceRepository $repository;

    public function __construct()
    {
        $this->repository = new MaintenanceRepository();
    }

    /**
     * Get all maintenance requests for current user
     */
    public function getUserRequests(int $userId, string $role, array $filters = []): array
    {
        if ($role === 'boarder') {
            $requests = $this->repository->findByBoarder($userId, $filters);
        } else {
            $requests = $this->repository->findByLandlord($userId, $filters);
        }

        return array_map(function ($req) {
            $entity = new MaintenanceRequest($req);
            return $role === 'boarder' ? $entity->toPublicArray() : $entity->toArray();
        }, $requests);
    }

    /**
     * Get a single maintenance request with details
     */
    public function getRequest(int $id, int $userId, string $role): ?array
    {
        $request = $this->repository->findById($id);

        if (!$request) {
            return null;
        }

        // Verify ownership
        if ($role === 'boarder' && $request['boarder_id'] !== $userId) {
            return null;
        }
        if ($role === 'landlord' && $request['landlord_id'] !== $userId) {
            return null;
        }

        $entity = new MaintenanceRequest($request);
        $data = $entity->toArray();

        // Get comments
        $comments = $this->repository->getComments($id);
        $data['comments'] = array_map(function ($comment) {
            $commentEntity = new MaintenanceComment($comment);
            return $commentEntity->toPublicArray();
        }, $comments);

        return $data;
    }

    /**
     * Create a new maintenance request
     */
    public function createRequest(array $data, int $boarderId): array
    {
        // Validate required fields
        $required = ['title', 'description', 'category', 'landlord_id'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        // Validate category
        $validCategories = ['Plumbing', 'Electrical', 'Appliances', 'Furniture', 'Structural', 'Cleaning', 'Other'];
        if (!in_array($data['category'], $validCategories)) {
            throw new \InvalidArgumentException("Invalid category: {$data['category']}");
        }

        // Validate priority
        $validPriorities = ['Low', 'Medium', 'Urgent'];
        $priority = $data['priority'] ?? 'Medium';
        if (!in_array($priority, $validPriorities)) {
            throw new \InvalidArgumentException("Invalid priority: $priority");
        }

        $data['boarder_id'] = $boarderId;
        $data['priority'] = $priority;

        $id = $this->repository->create($data);

        $result = $this->getRequest($id, $boarderId, 'boarder');

        // Notify landlord about new request
        $boarderName = $result['boarder_first_name'] . ' ' . $result['boarder_last_name'] ?? 'A boarder';
        Notification::notifyLandlordNewRequest(
            $data['landlord_id'],
            $id,
            $data['title'],
            $boarderName
        );

        // If urgent, send additional notification
        if ($priority === 'Urgent') {
            Notification::notifyUrgentRequest(
                $data['landlord_id'],
                $id,
                $data['title'],
                $boarderName
            );
        }

        return $result;
    }

    /**
     * Update request status (landlord only)
     */
    public function updateStatus(int $requestId, string $status, int $landlordId): array
    {
        $validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected', 'Closed'];
        if (!in_array($status, $validStatuses)) {
            throw new \InvalidArgumentException("Invalid status: $status");
        }

        $request = $this->repository->findById($requestId);
        if (!$request) {
            throw new \RuntimeException('Maintenance request not found');
        }

        if ($request['landlord_id'] !== $landlordId) {
            throw new \RuntimeException('Unauthorized');
        }

        $oldStatus = $request['status'];
        $updateData = ['status' => $status];
        if ($status === 'Resolved' && empty($request['resolved_at'])) {
            $updateData['resolved_at'] = date('Y-m-d H:i:s');
        }

        $this->repository->update($requestId, $updateData);

        // Add system note
        $this->repository->addComment(
            $requestId,
            $landlordId,
            'landlord',
            "Status changed to: $status",
            null
        );

        // Notify boarder of status change
        Notification::notifyBoarderStatusChange(
            $request['boarder_id'],
            $requestId,
            $oldStatus,
            $status,
            $request['title']
        );

        return $this->getRequest($requestId, $landlordId, 'landlord');
    }

    /**
     * Add a comment to a maintenance request
     */
    public function addComment(int $requestId, int $userId, string $userType, string $comment, ?array $images = null): array
    {
        $request = $this->repository->findById($requestId);
        if (!$request) {
            throw new \RuntimeException('Maintenance request not found');
        }

        // Verify user is part of this request
        if ($userType === 'boarder' && $request['boarder_id'] !== $userId) {
            throw new \RuntimeException('Unauthorized');
        }
        if ($userType === 'landlord' && $request['landlord_id'] !== $userId) {
            throw new \RuntimeException('Unauthorized');
        }

        if (empty(trim($comment))) {
            throw new \InvalidArgumentException('Comment cannot be empty');
        }

        $commentId = $this->repository->addComment($requestId, $userId, $userType, $comment, $images);

        // Notify the other party
        $authorName = ($userType === 'boarder' ? 'Boarder' : 'Landlord');
        if ($userType === 'boarder') {
            Notification::notifyComment(
                $request['landlord_id'],
                $requestId,
                $authorName,
                $request['title'],
                $userType
            );
        } else {
            Notification::notifyComment(
                $request['boarder_id'],
                $requestId,
                $authorName,
                $request['title'],
                $userType
            );
        }

        return $this->getRequest($requestId, $userId, $userType);
    }

    /**
     * Get maintenance statistics
     */
    public function getStats(int $userId, string $role): array
    {
        return $this->repository->getStats($userId, $role);
    }

    /**
     * Delete a maintenance request (landlord only)
     */
    public function deleteRequest(int $requestId, int $landlordId): bool
    {
        $request = $this->repository->findById($requestId);
        if (!$request) {
            throw new \RuntimeException('Maintenance request not found');
        }

        if ($request['landlord_id'] !== $landlordId) {
            throw new \RuntimeException('Unauthorized');
        }

        return $this->repository->delete($requestId);
    }

    /**
     * Bulk update status for multiple requests (landlord only)
     */
    public function bulkUpdateStatus(array $requestIds, string $status, int $landlordId): array
    {
        $validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected', 'Closed'];
        if (!in_array($status, $validStatuses)) {
            throw new \InvalidArgumentException("Invalid status: $status");
        }

        if (empty($requestIds)) {
            throw new \InvalidArgumentException('No request IDs provided');
        }

        $updated = [];
        $failed = [];

        foreach ($requestIds as $requestId) {
            try {
                $request = $this->repository->findById((int) $requestId);
                if (!$request) {
                    $failed[] = ['id' => $requestId, 'reason' => 'Not found'];
                    continue;
                }

                if ($request['landlord_id'] !== $landlordId) {
                    $failed[] = ['id' => $requestId, 'reason' => 'Unauthorized'];
                    continue;
                }

                $oldStatus = $request['status'];
                $updateData = ['status' => $status];
                if ($status === 'Resolved' && empty($request['resolved_at'])) {
                    $updateData['resolved_at'] = date('Y-m-d H:i:s');
                }

                $this->repository->update((int) $requestId, $updateData);

                // Add system note
                $this->repository->addComment(
                    (int) $requestId,
                    $landlordId,
                    'landlord',
                    "Status changed to: $status",
                    null
                );

                // Notify boarder
                Notification::notifyBoarderStatusChange(
                    $request['boarder_id'],
                    (int) $requestId,
                    $oldStatus,
                    $status,
                    $request['title']
                );

                $updated[] = $requestId;
            } catch (\Exception $e) {
                $failed[] = ['id' => $requestId, 'reason' => $e->getMessage()];
            }
        }

        return [
            'updated' => $updated,
            'failed' => $failed,
            'total_updated' => count($updated),
            'total_failed' => count($failed),
        ];
    }

    /**
     * Assign request to contractor (landlord only)
     */
    public function assignContractor(int $requestId, int $contractorId, int $landlordId): array
    {
        $request = $this->repository->findById($requestId);
        if (!$request) {
            throw new \RuntimeException('Maintenance request not found');
        }

        if ($request['landlord_id'] !== $landlordId) {
            throw new \RuntimeException('Unauthorized');
        }

        $this->repository->update($requestId, ['assigned_to' => $contractorId]);

        // Add system note
        $this->repository->addComment(
            $requestId,
            $landlordId,
            'landlord',
            "Assigned to contractor (ID: $contractorId)",
            null
        );

        // Notify boarder
        Notification::notifyContractorAssigned(
            $request['boarder_id'],
            $requestId,
            $contractorId,
            $request['title']
        );

        return $this->getRequest($requestId, $landlordId, 'landlord');
    }

    /**
     * Rate a resolved maintenance request (boarder only)
     */
    public function rateRequest(int $requestId, int $rating, ?string $feedback, int $boarderId): array
    {
        if ($rating < 1 || $rating > 5) {
            throw new \InvalidArgumentException('Rating must be between 1 and 5');
        }

        $request = $this->repository->findById($requestId);
        if (!$request) {
            throw new \RuntimeException('Maintenance request not found');
        }

        if ($request['boarder_id'] !== $boarderId) {
            throw new \RuntimeException('Unauthorized');
        }

        if ($request['status'] !== 'Resolved' && $request['status'] !== 'Closed') {
            throw new \RuntimeException('Can only rate resolved or closed requests');
        }

        $this->repository->addRating($requestId, $boarderId, $rating, $feedback);

        return [
            'request_id' => $requestId,
            'rating' => $rating,
            'feedback' => $feedback,
            'message' => 'Rating submitted successfully',
        ];
    }
}
