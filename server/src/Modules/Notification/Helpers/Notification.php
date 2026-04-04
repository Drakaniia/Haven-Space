<?php

namespace App\Modules\Notification\Helpers;

/**
 * Notification Helper
 * Simple notification system for logging and triggering notifications
 * Can be extended for email, push, and SMS notifications
 */
class Notification
{
    /**
     * Send a notification (currently logs, can be extended for email/push)
     *
     * @param int $userId The user to notify
     * @param string $type Notification type (status_change, comment, new_request, etc.)
     * @param string $title Notification title
     * @param string $message Notification message
     * @param array $metadata Additional metadata
     */
    public static function send(int $userId, string $type, string $title, string $message, array $metadata = []): void
    {
        // Log the notification
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'metadata' => $metadata,
        ];

        error_log('[NOTIFICATION] ' . json_encode($logEntry));

        // TODO: Integrate with database notification table
        // TODO: Integrate with email service (PHPMailer, SendGrid, etc.)
        // TODO: Integrate with push notification service (Firebase, etc.)
        // TODO: Integrate with SMS service (Twilio, etc.)
    }

    /**
     * Notify boarder when maintenance request status changes
     */
    public static function notifyBoarderStatusChange(int $boarderId, int $requestId, string $oldStatus, string $newStatus, string $requestTitle): void
    {
        $title = 'Maintenance Request Status Updated';
        $message = "Your maintenance request \"$requestTitle\" status has been changed from \"$oldStatus\" to \"$newStatus\".";

        self::send(
            $boarderId,
            'maintenance_status_change',
            $title,
            $message,
            [
                'request_id' => $requestId,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
            ]
        );
    }

    /**
     * Notify landlord when a new maintenance request is submitted
     */
    public static function notifyLandlordNewRequest(int $landlordId, int $requestId, string $requestTitle, string $boarderName): void
    {
        $title = 'New Maintenance Request';
        $message = "$boarderName submitted a new maintenance request: \"$requestTitle\".";

        self::send(
            $landlordId,
            'maintenance_new_request',
            $title,
            $message,
            [
                'request_id' => $requestId,
                'request_title' => $requestTitle,
                'boarder_name' => $boarderName,
            ]
        );
    }

    /**
     * Notify user when a comment is added to a maintenance request
     */
    public static function notifyComment(int $recipientId, int $requestId, string $commentAuthor, string $requestTitle, string $userType): void
    {
        $title = 'New Comment on Maintenance Request';
        $message = "$commentAuthor added a comment to \"$requestTitle\".";

        self::send(
            $recipientId,
            'maintenance_comment',
            $title,
            $message,
            [
                'request_id' => $requestId,
                'request_title' => $requestTitle,
                'comment_author' => $commentAuthor,
                'user_type' => $userType,
            ]
        );
    }

    /**
     * Notify boarder when their request is assigned to a contractor
     */
    public static function notifyContractorAssigned(int $boarderId, int $requestId, int $contractorId, string $requestTitle): void
    {
        $title = 'Contractor Assigned to Your Request';
        $message = "A contractor has been assigned to your maintenance request: \"$requestTitle\".";

        self::send(
            $boarderId,
            'maintenance_contractor_assigned',
            $title,
            $message,
            [
                'request_id' => $requestId,
                'contractor_id' => $contractorId,
            ]
        );
    }

    /**
     * Notify landlord when an urgent request is submitted
     */
    public static function notifyUrgentRequest(int $landlordId, int $requestId, string $requestTitle, string $boarderName): void
    {
        $title = 'URGENT: Maintenance Request Requires Immediate Attention';
        $message = "$boarderName submitted an urgent maintenance request: \"$requestTitle\". Please review as soon as possible.";

        self::send(
            $landlordId,
            'maintenance_urgent_request',
            $title,
            $message,
            [
                'request_id' => $requestId,
                'request_title' => $requestTitle,
                'boarder_name' => $boarderName,
            ]
        );
    }
}
