<?php

namespace App\Modules\Notification\Controllers;

use App\Modules\Notification\Services\NotificationService;
use App\Api\Middleware;

/**
 * Notification Controller
 * Handles HTTP requests for notifications
 */
class NotificationController
{
    private NotificationService $service;

    public function __construct()
    {
        $this->service = new NotificationService();
    }

    /**
     * Get current user notifications
     * GET /api/notifications
     */
    public function index($request)
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];
        $userRole = $user['role'] ?? null;

        $limit = (int) ($_GET['limit'] ?? 50);
        $offset = (int) ($_GET['offset'] ?? 0);

        $notifications = $this->service->getUserNotifications($userId, $limit, $offset, $userRole);
        $unreadCount = $this->service->getUnreadCount($userId);

        json_response(200, [
            'data' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Get unread notification count
     * GET /api/notifications/unread-count
     */
    public function unreadCount($request)
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];

        $count = $this->service->getUnreadCount($userId);

        json_response(200, ['data' => ['unread_count' => $count]]);
    }

    /**
     * Mark a notification as read
     * PATCH /api/notifications/{id}/read
     */
    public function markAsRead($request, $id)
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];

        try {
            $this->service->markAsRead((int) $id, $userId);
            json_response(200, ['message' => 'Notification marked as read']);
        } catch (\RuntimeException $e) {
            json_response(404, ['error' => $e->getMessage()]);
        }
    }

    /**
     * Mark all notifications as read
     * PATCH /api/notifications/read-all
     */
    public function markAllAsRead($request)
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];

        $this->service->markAllAsRead($userId);
        json_response(200, ['message' => 'All notifications marked as read']);
    }

    /**
     * Delete a notification
     * DELETE /api/notifications/{id}
     */
    public function destroy($request, $id)
    {
        $user = Middleware::authenticate();
        $userId = $user['user_id'];

        try {
            $this->service->deleteNotification((int) $id, $userId);
            json_response(200, ['message' => 'Notification deleted']);
        } catch (\RuntimeException $e) {
            json_response(404, ['error' => $e->getMessage()]);
        }
    }

    /**
     * Get boarder's accepted applications (for overlay)
     * GET /api/boarder/accepted-applications
     */
    public function getAcceptedApplications($request)
    {
        $user = Middleware::authorize(['boarder']);
        $userId = $user['user_id'];

        $applications = $this->service->getAcceptedApplications($userId);

        json_response(200, ['data' => $applications]);
    }

    /**
     * Check if boarder has any accepted applications
     * GET /api/boarder/has-accepted-applications
     */
    public function hasAcceptedApplications($request)
    {
        $user = Middleware::authorize(['boarder']);
        $userId = $user['user_id'];

        $result = $this->service->hasAcceptedApplications($userId);

        json_response(200, [
            'has_accepted' => $result['has_accepted'],
            'property_ids' => $result['property_ids'],
        ]);
    }
}
