<?php

namespace App\Modules\Notification\Services;

use App\Modules\Notification\Repositories\NotificationRepository;
use App\Modules\Notification\Helpers\Notification;

/**
 * Notification Service
 * Business logic for notifications
 */
class NotificationService
{
    private NotificationRepository $repository;

    public function __construct()
    {
        $this->repository = new NotificationRepository();
    }

    /**
     * Get all notifications for current user
     */
    public function getUserNotifications(int $userId, int $limit = 50, int $offset = 0): array
    {
        $notifications = $this->repository->findByUser($userId, $limit, $offset);

        return array_map(function ($n) {
            $n['metadata'] = $n['metadata'] ? json_decode($n['metadata'], true) : null;
            $n['is_read'] = (bool) $n['is_read'];
            return $n;
        }, $notifications);
    }

    /**
     * Get unread notification count
     */
    public function getUnreadCount(int $userId): int
    {
        return $this->repository->countUnread($userId);
    }

    /**
     * Create a notification
     */
    public function createNotification(array $data): int
    {
        $id = $this->repository->create($data);

        // Also log via the helper
        Notification::send(
            $data['user_id'],
            $data['type'],
            $data['title'],
            $data['message'] ?? '',
            $data['metadata'] ?? []
        );

        return $id;
    }

    /**
     * Mark a notification as read
     */
    public function markAsRead(int $notificationId, int $userId): bool
    {
        $notification = $this->repository->findById($notificationId, $userId);
        if (!$notification) {
            throw new \RuntimeException('Notification not found');
        }

        return $this->repository->markAsRead($notificationId, $userId);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(int $userId): bool
    {
        return $this->repository->markAllAsRead($userId);
    }

    /**
     * Delete a notification
     */
    public function deleteNotification(int $notificationId, int $userId): bool
    {
        $notification = $this->repository->findById($notificationId, $userId);
        if (!$notification) {
            throw new \RuntimeException('Notification not found');
        }

        return $this->repository->delete($notificationId, $userId);
    }

    /**
     * Create application accepted notification for boarder
     */
    public function notifyApplicationAccepted(int $boarderId, int $landlordId, int $applicationId, int $propertyId, int $roomId, string $propertyName, string $roomTitle, float $roomPrice): int
    {
        $data = [
            'user_id' => $boarderId,
            'type' => 'application_accepted',
            'title' => 'Your Application Was Accepted!',
            'message' => "Your application for {$roomTitle} at {$propertyName} (P" . number_format($roomPrice) . "/month) has been accepted.",
            'metadata' => [
                'application_id' => $applicationId,
                'property_id' => $propertyId,
                'room_id' => $roomId,
                'landlord_id' => $landlordId,
                'property_name' => $propertyName,
                'room_title' => $roomTitle,
                'room_price' => $roomPrice,
            ],
        ];

        return $this->repository->create($data);
    }

    /**
     * Get boarder's accepted applications with property details
     */
    public function getAcceptedApplications(int $boarderId): array
    {
        return $this->repository->getAcceptedApplications($boarderId);
    }

    /**
     * Check if boarder has any accepted applications
     */
    public function hasAcceptedApplications(int $boarderId): bool
    {
        return $this->repository->hasAcceptedApplications($boarderId);
    }
}
