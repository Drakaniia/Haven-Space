<?php

namespace App\Modules\Onboarding\Controllers;

use App\Modules\Onboarding\Services\OnboardingService;
use App\Api\Middleware;

/**
 * Onboarding Controller
 * Handles HTTP requests for boarder onboarding system
 */
class OnboardingController
{
    private OnboardingService $service;

    public function __construct()
    {
        $this->service = new OnboardingService();
    }

    // ========== LANDLORD ENDPOINTS ==========

    /**
     * Get welcome message template
     * GET /api/landlord/welcome-message
     */
    public function getWelcomeTemplate($request)
    {
        $user = Middleware::authorize(['landlord']);
        $userId = $user['user_id'];

        $propertyId = isset($_GET['property_id']) ? (int) $_GET['property_id'] : null;

        $template = $this->service->getWelcomeTemplate($userId, $propertyId);

        json_response(200, ['data' => $template]);
    }

    /**
     * Create/update welcome message template
     * POST /api/landlord/welcome-message
     */
    public function saveWelcomeTemplate($request)
    {
        $user = Middleware::authorize(['landlord']);
        $userId = $user['user_id'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || empty($data['message_text'])) {
            json_response(400, ['error' => 'Message text is required']);
            return;
        }

        $propertyId = isset($data['property_id']) ? (int) $data['property_id'] : null;

        try {
            $template = $this->service->saveWelcomeTemplate($userId, $propertyId, $data['message_text']);
            json_response(200, ['data' => $template, 'message' => 'Welcome message saved successfully']);
        } catch (\InvalidArgumentException $e) {
            json_response(400, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to save welcome message']);
        }
    }

    /**
     * Get landlord documents
     * GET /api/landlord/documents
     */
    public function getDocuments($request)
    {
        $user = Middleware::authorize(['landlord']);
        $userId = $user['user_id'];

        $propertyId = isset($_GET['property_id']) ? (int) $_GET['property_id'] : null;

        $documents = $this->service->getLandlordDocuments($userId, $propertyId);

        json_response(200, ['data' => $documents]);
    }

    /**
     * Upload a document
     * POST /api/landlord/documents
     */
    public function uploadDocument($request)
    {
        $user = Middleware::authorize(['landlord']);
        $userId = $user['user_id'];

        if (!isset($_FILES['document'])) {
            json_response(400, ['error' => 'No document uploaded']);
            return;
        }

        $data = [
            'category' => $_POST['category'] ?? 'Custom',
            'auto_send_to_new_boarders' => isset($_POST['auto_send']) && $_POST['auto_send'] === 'true',
            'property_id' => isset($_POST['property_id']) ? (int) $_POST['property_id'] : null,
        ];

        try {
            $document = $this->service->addDocument($data, $_FILES['document'], $userId);
            json_response(201, ['data' => $document, 'message' => 'Document uploaded successfully']);
        } catch (\RuntimeException $e) {
            json_response(400, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to upload document']);
        }
    }

    /**
     * Toggle auto-send for a document
     * POST /api/landlord/documents/auto-send
     */
    public function toggleAutoSend($request)
    {
        $user = Middleware::authorize(['landlord']);
        $userId = $user['user_id'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['document_id']) || !isset($data['is_active'])) {
            json_response(400, ['error' => 'Document ID and is_active flag are required']);
            return;
        }

        $propertyId = isset($data['property_id']) ? (int) $data['property_id'] : null;

        try {
            $result = $this->service->toggleAutoSend($userId, (int) $data['document_id'], $propertyId, (bool) $data['is_active']);
            json_response(200, ['success' => $result, 'message' => 'Auto-send setting updated']);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to update auto-send setting']);
        }
    }

    /**
     * Get auto-send documents
     * GET /api/landlord/documents/auto-send
     */
    public function getAutoSendDocuments($request)
    {
        $user = Middleware::authorize(['landlord']);
        $userId = $user['user_id'];

        $propertyId = isset($_GET['property_id']) ? (int) $_GET['property_id'] : null;

        $documents = $this->service->getAutoSendDocuments($userId, $propertyId);

        json_response(200, ['data' => $documents]);
    }

    /**
     * Delete a document
     * DELETE /api/landlord/documents/:id
     */
    public function deleteDocument($request, $id)
    {
        $user = Middleware::authorize(['landlord']);
        $userId = $user['user_id'];

        try {
            $result = $this->service->deleteDocument((int) $id, $userId);
            json_response(200, ['success' => $result, 'message' => 'Document deleted successfully']);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to delete document']);
        }
    }

    // ========== BOARDER ENDPOINTS ==========

    /**
     * Get boarder documents (received via onboarding)
     * GET /api/boarder/documents
     */
    public function getBoarderDocuments($request)
    {
        $user = Middleware::authorize(['boarder']);
        $userId = $user['user_id'];

        $documents = $this->service->getBoarderDocuments($userId);

        json_response(200, ['data' => $documents]);
    }

    /**
     * Acknowledge document receipt
     * POST /api/boarder/documents/acknowledge
     */
    public function acknowledgeDocument($request)
    {
        $user = Middleware::authorize(['boarder']);
        $userId = $user['user_id'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['document_id'])) {
            json_response(400, ['error' => 'Document ID is required']);
            return;
        }

        try {
            $result = $this->service->acknowledgeDocument($userId, (int) $data['document_id']);
            json_response(200, ['success' => $result, 'message' => 'Document acknowledged successfully']);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to acknowledge document']);
        }
    }

    // ========== SHARED ENDPOINTS ==========

    /**
     * Trigger welcome flow (called when application is accepted)
     * POST /api/onboarding/welcome
     */
    public function triggerWelcome($request)
    {
        $user = Middleware::authorize(['landlord']);
        $userId = $user['user_id'];

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['boarder_id']) || !isset($data['property_id']) || !isset($data['house_name'])) {
            json_response(400, ['error' => 'Boarder ID, property ID, and house name are required']);
            return;
        }

        try {
            $conversationId = $this->service->triggerWelcomeFlow(
                (int) $data['boarder_id'],
                $userId,
                (int) $data['property_id'],
                $data['house_name'],
                $data['custom_message'] ?? null
            );

            json_response(200, [
                'conversation_id' => $conversationId,
                'message' => 'Welcome flow triggered successfully',
            ]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to trigger welcome flow']);
        }
    }
}
