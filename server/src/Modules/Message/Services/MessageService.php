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

    /**
     * Get user's conversation list
     */
    public function getUserConversations(int $userId): array
    {
        $conversations = $this->repository->getUserConversations($userId);

        return array_map(function ($conv) {
            $entity = new Conversation($conv);
            return $entity->toPublicArray();
        }, $conversations);
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
