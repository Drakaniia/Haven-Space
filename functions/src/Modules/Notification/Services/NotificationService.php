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
    public function getUserNotifications(int $userId, int $limit = 50, int $offset = 0, string $userRole = null): array
    {
        $notifications = $this->repository->findByUser($userId, $limit, $offset);

        // Filter notifications based on user role
        if ($userRole) {
            $notifications = array_filter($notifications, function ($notification) use ($userRole) {
                $notificationType = $notification['type'];
                
                // Admin: only show landlord-related notifications (currently none defined, so show nothing)
                if ($userRole === 'admin') {
                    // Currently no specific admin notifications are defined
                    // This would be for landlord verification submissions in the future
                    return false;
                }
                
                // Landlord: only show boarder application notifications
                if ($userRole === 'landlord') {
                    return $notificationType === 'new_application' || 
                           $notificationType === 'application_accepted' ||
                           $notificationType === 'application_rejected' ||
                           $notificationType === 'maintenance_request' ||
                           $notificationType === 'maintenance_status_change';
                }
                
                // Boarder: only show accepted listing notifications
                if ($userRole === 'boarder') {
                    return $notificationType === 'application_accepted' ||
                           $notificationType === 'maintenance_status_change';
                }
                
                return true; // Default: show all if role not specified
            });
            
            // Re-index array after filtering
            $notifications = array_values($notifications);
        }

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
     * Create new application notification for landlord
     */
    public function notifyNewApplication(int $landlordId, int $boarderId, int $applicationId, int $propertyId, int $roomId, string $propertyName, string $roomTitle, string $boarderName): int
    {
        $data = [
            'user_id' => $landlordId,
            'type' => 'new_application',
            'title' => 'New Application Received',
            'message' => "{$boarderName} has applied for {$roomTitle} at {$propertyName}. Please review their application.",
            'metadata' => [
                'application_id' => $applicationId,
                'property_id' => $propertyId,
                'room_id' => $roomId,
                'boarder_id' => $boarderId,
                'property_name' => $propertyName,
                'room_title' => $roomTitle,
                'boarder_name' => $boarderName,
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
     * Returns both boolean status and array of property IDs
     */
    public function hasAcceptedApplications(int $boarderId): array
    {
        return $this->repository->hasAcceptedApplications($boarderId);
    }

    /**
     * Create maintenance request notification for landlord
     */
    public function notifyMaintenanceRequest(int $landlordId, int $boarderId, int $maintenanceId, string $title): int
    {
        $data = [
            'user_id' => $landlordId,
            'type' => 'maintenance_request',
            'title' => 'New Maintenance Request',
            'message' => "A new maintenance request has been submitted: {$title}",
            'metadata' => [
                'maintenance_id' => $maintenanceId,
                'boarder_id' => $boarderId,
            ],
        ];

        return $this->repository->create($data);
    }

    /**
     * Create maintenance status change notification for boarder
     */
    public function notifyMaintenanceStatusChange(int $boarderId, int $landlordId, int $maintenanceId, string $status, string $title): int
    {
        $statusMessages = [
            'pending' => 'Your maintenance request is pending',
            'in_progress' => 'Your maintenance request is now in progress',
            'completed' => 'Your maintenance request has been completed',
            'cancelled' => 'Your maintenance request has been cancelled',
        ];

        $message = $statusMessages[$status] ?? 'Your maintenance request status has been updated';

        $data = [
            'user_id' => $boarderId,
            'type' => 'maintenance_status_change',
            'title' => 'Maintenance Request Update',
            'message' => "{$message}: {$title}",
            'metadata' => [
                'maintenance_id' => $maintenanceId,
                'landlord_id' => $landlordId,
                'status' => $status,
            ],
        ];

        return $this->repository->create($data);
    }

    /**
     * Create booking confirmed notification for landlord
     */
    public function notifyBookingConfirmed(int $landlordId, int $boarderId, int $applicationId, int $propertyId, int $roomId, string $propertyName, string $roomTitle): int
    {
        $data = [
            'user_id' => $landlordId,
            'type' => 'booking_confirmed',
            'title' => 'Booking Confirmed',
            'message' => "A boarder has confirmed their booking for {$roomTitle} at {$propertyName}.",
            'metadata' => [
                'application_id' => $applicationId,
                'property_id' => $propertyId,
                'room_id' => $roomId,
                'boarder_id' => $boarderId,
                'property_name' => $propertyName,
                'room_title' => $roomTitle,
            ],
        ];

        return $this->repository->create($data);
    }
}
