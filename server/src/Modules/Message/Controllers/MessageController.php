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
        // TODO: Uncomment when MessageService is fully implemented
        // $this->service = new MessageService();
    }

    /**
     * Get user's conversations
     * GET /api/messages/conversations
     * TODO: Implement - Currently returns mock data for UI testing
     */
    public function index($request)
    {
        // TODO: Implement actual database query
        // $user = Middleware::authenticate();
        // $userId = $user['user_id'];
        // $conversations = $this->service->getUserConversations($userId);
        // json_response(200, ['data' => $conversations]);

        // Temporary mock response for UI testing
        $mockConversations = [
            [
                'id' => 1,
                'title' => 'Welcome Thread',
                'last_message' => 'Welcome to your new boarding house!',
                'last_message_at' => date('Y-m-d H:i:s'),
                'unread_count' => 1,
                'type' => 'welcome',
            ],
            [
                'id' => 2,
                'title' => 'Boarder - Maria Santos',
                'last_message' => 'Is the room still available?',
                'last_message_at' => date('Y-m-d H:i:s', strtotime('-1 hour')),
                'unread_count' => 0,
                'type' => 'direct',
            ],
        ];

        json_response(200, ['data' => $mockConversations]);
    }

    /**
     * Get specific conversation with messages
     * GET /api/messages/conversations/:id
     * TODO: Implement - Currently returns mock data for UI testing
     */
    public function show($request, $conversationId)
    {
        // TODO: Implement actual database query
        // $user = Middleware::authenticate();
        // $userId = $user['user_id'];
        // try {
        //     $conversation = $this->service->getConversation((int) $conversationId, $userId);
        //     json_response(200, ['data' => $conversation]);
        // } catch (\RuntimeException $e) {
        //     json_response(404, ['error' => $e->getMessage()]);
        // }

        // Temporary mock response for UI testing
        $mockConversation = [
            'id' => (int) $conversationId,
            'title' => 'Sample Conversation',
            'type' => 'direct',
            'messages' => [
                [
                    'id' => 1,
                    'sender_id' => 2,
                    'message_text' => 'Hello! Is this room still available?',
                    'created_at' => date('Y-m-d H:i:s', strtotime('-2 hours')),
                    'attachments' => [],
                ],
                [
                    'id' => 2,
                    'sender_id' => 1,
                    'message_text' => 'Yes, it is! Would you like to schedule a viewing?',
                    'created_at' => date('Y-m-d H:i:s', strtotime('-1 hour')),
                    'attachments' => [],
                ],
            ],
        ];

        json_response(200, ['data' => $mockConversation]);
    }

    /**
     * Create/send a new message
     * POST /api/messages
     * TODO: Implement - Currently returns success mock response
     */
    public function store($request)
    {
        // TODO: Implement actual message sending
        // $user = Middleware::authenticate();
        // $userId = $user['user_id'];
        // $data = json_decode(file_get_contents('php://input'), true);
        // if (!$data) {
        //     json_response(400, ['error' => 'Invalid JSON input']);
        //     return;
        // }
        // try {
        //     $result = $this->service->sendMessage($data, $userId);
        //     json_response(201, ['data' => $result, 'message' => 'Message sent successfully']);
        // } catch (\InvalidArgumentException $e) {
        //     json_response(400, ['error' => $e->getMessage()]);
        // } catch (\RuntimeException $e) {
        //     json_response(403, ['error' => $e->getMessage()]);
        // } catch (\Exception $e) {
        //     json_response(500, ['error' => 'Failed to send message']);
        // }

        // Temporary mock response for UI testing
        json_response(201, [
            'data' => [
                'id' => time(),
                'message_text' => 'Mock message',
                'created_at' => date('Y-m-d H:i:s'),
            ],
            'message' => 'Message sent successfully (mock)',
        ]);
    }

    /**
     * Mark messages as read
     * PUT /api/messages/conversations/:id/read
     * TODO: Implement - Currently returns success mock response
     */
    public function markAsRead($request, $conversationId)
    {
        // TODO: Implement actual database update
        // $user = Middleware::authenticate();
        // $userId = $user['user_id'];
        // try {
        //     $this->service->markMessagesAsRead((int) $conversationId, $userId);
        //     json_response(200, ['message' => 'Messages marked as read']);
        // } catch (\Exception $e) {
        //     json_response(500, ['error' => 'Failed to mark messages as read']);
        // }

        // Temporary mock response for UI testing
        json_response(200, ['message' => 'Messages marked as read (mock)']);
    }

    /**
     * Search messages
     * GET /api/messages/search?q={query}
     * TODO: Implement - Currently returns empty results
     */
    public function search($request)
    {
        // TODO: Implement actual search functionality
        // $user = Middleware::authenticate();
        // $userId = $user['user_id'];
        // $searchTerm = $_GET['q'] ?? '';
        // if (empty(trim($searchTerm))) {
        //     json_response(400, ['error' => 'Search query is required']);
        //     return;
        // }
        // $messages = $this->service->searchMessages($userId, $searchTerm);
        // json_response(200, ['data' => $messages]);

        // Temporary mock response for UI testing
        json_response(200, ['data' => []]);
    }

    /**
     * Get unread message count
     * GET /api/messages/unread-count
     * TODO: Implement - Currently returns mock count
     */
    public function unreadCount($request)
    {
        // TODO: Implement actual database query
        // $user = Middleware::authenticate();
        // $userId = $user['user_id'];
        // $count = $this->service->getUnreadCount($userId);
        // json_response(200, ['data' => ['unread_count' => $count]]);

        // Temporary mock response for UI testing
        json_response(200, ['data' => ['unread_count' => 2]]);
    }
}
