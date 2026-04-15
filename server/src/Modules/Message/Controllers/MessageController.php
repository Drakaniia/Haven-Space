<?php

namespace App\Modules\Message\Controllers;

use App\Modules\Message\Services\MessageService;
use App\Api\Middleware;

/**
 * Message Controller
 * Handles HTTP requests for messaging system
 * 
 * TODO: Implement full messaging functionality - currently returns errors when backend is not running
 * Frontend is using mock data for UI display until backend is fully implemented
 */
class MessageController
{
    private MessageService $service;

    public function __construct()
    {
        $this->service = new MessageService();
    }

    /**
     * Get current user ID (with simulation bypass)
     */
    private function getCurrentUser()
    {
        // Simulation bypass - check for simulated ID first
        $simulatedId = $_SERVER['HTTP_X_USER_ID'] ?? $_GET['user_id'] ?? null;
        
        if ($simulatedId) {
            return ['user_id' => (int)$simulatedId, 'role' => 'unknown'];
        }

        // Try actual authentication
        try {
            // Note: Middleware::authenticate() calls exit() on failure, 
            // so we only reach here if it succeeds OR if we check manually
            
            $hasToken = !empty($_SERVER['HTTP_AUTHORIZATION']) || 
                        !empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) || 
                        !empty($_COOKIE['access_token']);
            
            if ($hasToken) {
                return Middleware::authenticate();
            }
        } catch (\Exception $e) {
            // Fall through to simulation if auth fails
        }
        
        // Default simulation based on common usage in this project
        // Landlord simulation
        if (strpos($_SERVER['HTTP_REFERER'] ?? '', 'landlord') !== false) {
            return ['user_id' => 4, 'role' => 'landlord'];
        }
        // Boarder simulation
        return ['user_id' => 3, 'role' => 'boarder'];
    }

    /**
     * Get user's conversations
     * GET /api/messages/conversations
     */
    public function index($request)
    {
        $user = $this->getCurrentUser();
        $userId = (int) $user['user_id'];
        
        $conversations = $this->service->getUserConversations($userId);
        json_response(200, ['data' => $conversations]);
    }

    /**
     * Get specific conversation with messages
     * GET /api/messages/conversations/:id
     */
    public function show($request, $conversationId)
    {
        $user = $this->getCurrentUser();
        $userId = (int) $user['user_id'];
        
        try {
            $conversation = $this->service->getConversation((int) $conversationId, $userId);
            json_response(200, ['data' => $conversation]);
        } catch (\RuntimeException $e) {
            json_response(404, ['error' => $e->getMessage()]);
        }
    }

    /**
     * Helper to get JSON input
     */
    private function getJsonInput()
    {
        $input = file_get_contents('php://input');
        return json_decode($input, true) ?: [];
    }

    /**
     * Create/send a new message
     * POST /api/messages
     */
    public function store($request)
    {
        $user = $this->getCurrentUser();
        $userId = (int) $user['user_id'];
        
        $data = $this->getJsonInput();
        if (empty($data)) {
            json_response(400, ['error' => 'Invalid JSON input']);
            return;
        }

        try {
            $result = $this->service->sendMessage($data, $userId);
            json_response(201, ['data' => $result, 'message' => 'Message sent successfully']);
        } catch (\InvalidArgumentException $e) {
            json_response(400, ['error' => $e->getMessage()]);
        } catch (\RuntimeException $e) {
            json_response(403, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to send message: ' . $e->getMessage()]);
        }
    }

    /**
     * Start a new conversation with a recipient
     * POST /api/messages/new
     */
    public function startNew($request)
    {
        $user = $this->getCurrentUser();
        $userId = (int) $user['user_id'];
        
        $data = $this->getJsonInput();
        if (empty($data) || !isset($data['recipient_id']) || !isset($data['message_text'])) {
            json_response(400, ['error' => 'Recipient ID and message text are required']);
            return;
        }

        try {
            $result = $this->service->startConversation($userId, (int)$data['recipient_id'], $data['message_text']);
            json_response(201, ['data' => $result, 'message' => 'Conversation started successfully']);
        } catch (\InvalidArgumentException $e) {
            json_response(400, ['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to start conversation: ' . $e->getMessage()]);
        }
    }

    /**
     * Mark messages as read
     * PUT /api/messages/conversations/:id/read
     */
    public function markAsRead($request, $conversationId)
    {
        $user = $this->getCurrentUser();
        $userId = (int) $user['user_id'];
        
        try {
            $this->service->markMessagesAsRead((int) $conversationId, $userId);
            json_response(200, ['message' => 'Messages marked as read']);
        } catch (\Exception $e) {
            json_response(500, ['error' => 'Failed to mark messages as read']);
        }
    }

    /**
     * Search messages
     * GET /api/messages/search?q={query}
     */
    public function search($request)
    {
        $user = $this->getCurrentUser();
        $userId = (int) $user['user_id'];
        
        $searchTerm = $_GET['q'] ?? '';
        if (empty(trim($searchTerm))) {
            json_response(400, ['error' => 'Search query is required']);
            return;
        }
        
        $messages = $this->service->searchMessages($userId, $searchTerm);
        json_response(200, ['data' => $messages]);
    }

    /**
     * Get unread message count
     * GET /api/messages/unread-count
     */
    public function unreadCount($request)
    {
        $user = $this->getCurrentUser();
        $userId = (int) $user['user_id'];
        
        $count = $this->service->getUnreadCount($userId);
        json_response(200, ['data' => ['unread_count' => $count]]);
    }
}
