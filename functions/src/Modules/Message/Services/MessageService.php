<?php

namespace App\Modules\Message\Services;

use App\Modules\Message\Repositories\MessageRepository;
use App\Modules\Message\Entities\Conversation;
use App\Modules\Message\Entities\Message;
use App\Core\Upload\UploadHandler;

/**
 * Message Service
 * Business logic for messaging operations
 */
class MessageService
{
    private MessageRepository $repository;
    private UploadHandler $uploadHandler;

    public function __construct()
    {
        $this->repository = new MessageRepository();
        $this->uploadHandler = new UploadHandler();
    }

    public function getUserConversations(int $userId): array
    {
        $conversations = $this->repository->getUserConversations($userId);

        return array_map(function ($conv) use ($userId) {
            // Get participants to determine the other person
            $conv['participants'] = $this->repository->getConversationParticipants($conv['id']);
            $conv['title'] = $this->formatConversationTitle($conv, $userId);
            
            $entity = new Conversation($conv);
            return $entity->toPublicArray();
        }, $conversations);
    }

    /**
     * Helper to format conversation title based on viewer
     */
    private function formatConversationTitle(array $conversation, int $userId): string
    {
        if ($conversation['type'] !== 'direct') {
            return $conversation['title'];
        }

        // Find the other participant
        foreach ($conversation['participants'] as $participant) {
            if ($participant['user_id'] != $userId) {
                $roleLabel = ucfirst($participant['role']);
                return "$roleLabel - {$participant['first_name']} {$participant['last_name']}";
            }
        }

        return $conversation['title'];
    }

    /**
     * Get or create a direct conversation between two users
     */
    public function getOrCreateConversation(int $user1Id, int $user2Id): int
    {
        // Check for existing direct conversation
        $conversationId = $this->repository->findDirectConversation($user1Id, $user2Id);
        if ($conversationId) {
            return $conversationId;
        }

        // Get details for title
        $user1 = $this->repository->getUserDetails($user1Id);
        $user2 = $this->repository->getUserDetails($user2Id);
        
        if (!$user1 || !$user2) {
            throw new \RuntimeException('User not found');
        }

        // Create new direct conversation
        $title = $user1['role'] === 'landlord' ? "Boarder - " . $user2['first_name'] . " " . $user2['last_name'] 
                                              : "Landlord - " . $user2['first_name'] . " " . $user2['last_name'];
                                              
        $conversationId = $this->repository->createConversation([
            'title' => $title,
            'type' => 'direct',
            'created_by' => $user1Id,
            'is_system_thread' => false,
        ]);

        $this->repository->addParticipant($conversationId, $user1Id, $user1['role']);
        $this->repository->addParticipant($conversationId, $user2Id, $user2['role']);

        return $conversationId;
    }

    /**
     * Start a new conversation with an initial message
     */
    public function startConversation(int $senderId, int $receiverId, string $messageText): array
    {
        if (empty(trim($messageText))) {
            throw new \InvalidArgumentException("Message text is required");
        }

        $conversationId = $this->getOrCreateConversation($senderId, $receiverId);
        
        $this->sendMessage([
            'conversation_id' => $conversationId,
            'message_text' => $messageText
        ], $senderId);

        return $this->getConversation($conversationId, $senderId);
    }

    /**
     * Get conversation details with messages
     */
    public function getConversation(int $conversationId, int $userId): array
    {
        $conversation = $this->repository->getConversation($conversationId, $userId);

        if (!$conversation) {
            throw new \RuntimeException('Conversation not found');
        }

        // Verify user is a participant
        $isParticipant = false;
        foreach ($conversation['participants'] as $participant) {
            if ($participant['user_id'] == $userId) {
                $isParticipant = true;
                break;
            }
        }

        if (!$isParticipant) {
            throw new \RuntimeException('Unauthorized');
        }

        // Format dynamic title
        $conversation['title'] = $this->formatConversationTitle($conversation, $userId);

        // Get messages
        $messages = $this->repository->getConversationMessages($conversationId);

        $entity = new Conversation($conversation);
        $data = $entity->toPublicArray();
        $data['messages'] = array_map(function ($msg) {
            $msgEntity = new Message($msg);
            return $msgEntity->toPublicArray();
        }, $messages);

        // Mark messages as read
        $this->repository->markAsRead($conversationId, $userId);
        $this->repository->updateLastRead($conversationId, $userId);

        return $data;
    }

    /**
     * Send a message
     */
    public function sendMessage(array $data, int $senderId): array
    {
        $required = ['conversation_id', 'message_text'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        // Verify user is a participant
        $conversation = $this->repository->getConversation($data['conversation_id'], $senderId);
        if (!$conversation) {
            throw new \RuntimeException('Conversation not found');
        }

        $data['sender_id'] = $senderId;
        $data['has_attachment'] = false;

        $messageId = $this->repository->createMessage($data);

        // Return updated conversation
        return $this->getConversation($data['conversation_id'], $senderId);
    }

    /**
     * Send a message with attachment
     */
    public function sendMessageWithAttachment(array $data, array $files, int $senderId): array
    {
        $required = ['conversation_id', 'message_text'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        // Verify user is a participant
        $conversation = $this->repository->getConversation($data['conversation_id'], $senderId);
        if (!$conversation) {
            throw new \RuntimeException('Conversation not found');
        }

        $data['sender_id'] = $senderId;
        $data['has_attachment'] = true;

        $messageId = $this->repository->createMessage($data);

        // Upload files
        foreach ($files as $file) {
            $fileUrl = $this->uploadHandler->upload($file, 'messages');
            if ($fileUrl) {
                $this->repository->addAttachment(
                    $messageId,
                    $data['conversation_id'],
                    $fileUrl,
                    $file['name'],
                    $file['type'],
                    $file['size'],
                    $senderId
                );
            }
        }

        return $this->getConversation($data['conversation_id'], $senderId);
    }

    /**
     * Mark messages as read
     */
    public function markMessagesAsRead(int $conversationId, int $userId): bool
    {
        return $this->repository->markAsRead($conversationId, $userId);
    }

    /**
     * Search messages
     */
    public function searchMessages(int $userId, string $searchTerm): array
    {
        if (empty(trim($searchTerm))) {
            return [];
        }

        $messages = $this->repository->searchMessages($userId, $searchTerm);

        return array_map(function ($msg) {
            $entity = new Message($msg);
            return $entity->toPublicArray();
        }, $messages);
    }

    /**
     * Get unread message count
     */
    public function getUnreadCount(int $userId): int
    {
        return $this->repository->getUnreadCount($userId);
    }

    /**
     * Create a welcome conversation for new boarder
     */
    public function createWelcomeConversation(int $boarderId, int $landlordId, int $propertyId, string $houseName, string $welcomeMessage, array $documents = []): int
    {
        $conversationId = $this->repository->createWelcomeConversation(
            $boarderId,
            $landlordId,
            $propertyId,
            $houseName
        );

        // Send welcome message
        $messageId = $this->repository->createMessage([
            'conversation_id' => $conversationId,
            'sender_id' => $landlordId,
            'message_text' => $welcomeMessage,
            'has_attachment' => !empty($documents),
        ]);

        // Attach documents
        foreach ($documents as $doc) {
            $this->repository->addAttachment(
                $messageId,
                $conversationId,
                $doc['document_url'],
                $doc['document_name'],
                $doc['document_type'] ?? 'application/pdf',
                $doc['file_size'] ?? 0,
                $landlordId
            );
        }

        return $conversationId;
    }
}
