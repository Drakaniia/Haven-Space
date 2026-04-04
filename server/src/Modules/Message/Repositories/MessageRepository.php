<?php

namespace App\Modules\Message\Repositories;

use App\Core\Database\Connection;
use PDO;

/**
 * Message Repository
 * Handles database operations for messages
 */
class MessageRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Connection::getInstance()->getPdo();
    }

    /**
     * Get conversations for a user
     */
    public function getUserConversations(int $userId): array
    {
        $sql = 'SELECT c.*, 
                (SELECT message_text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0) as unread_count
                FROM conversations c
                INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
                WHERE cp.user_id = ? AND cp.is_active = 1
                ORDER BY last_message_at DESC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId, $userId]);
        return $stmt->fetchAll();
    }

    /**
     * Get conversation details with participants
     */
    public function getConversation(int $conversationId, int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT c.*, u.first_name, u.last_name
             FROM conversations c
             JOIN users u ON c.created_by = u.id
             WHERE c.id = ?'
        );
        $stmt->execute([$conversationId]);
        $conversation = $stmt->fetch();

        if (!$conversation) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT cp.*, u.first_name, u.last_name, u.email
             FROM conversation_participants cp
             JOIN users u ON cp.user_id = u.id
             WHERE cp.conversation_id = ?'
        );
        $stmt->execute([$conversationId]);
        $conversation['participants'] = $stmt->fetchAll();

        return $conversation;
    }

    /**
     * Get messages for a conversation
     */
    public function getConversationMessages(int $conversationId, int $limit = 50, int $offset = 0): array
    {
        $sql = 'SELECT m.*, u.first_name, u.last_name
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.conversation_id = ?
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$conversationId, $limit, $offset]);
        $messages = $stmt->fetchAll();

        foreach ($messages as &$message) {
            $stmt = $this->pdo->prepare(
                'SELECT * FROM message_attachments WHERE message_id = ?'
            );
            $stmt->execute([$message['id']]);
            $message['attachments'] = $stmt->fetchAll();
        }

        return array_reverse($messages);
    }

    /**
     * Create a conversation
     */
    public function createConversation(array $data): int
    {
        $sql = 'INSERT INTO conversations (title, type, property_id, created_by, is_system_thread) 
                VALUES (?, ?, ?, ?, ?)';
        
        $this->pdo->prepare($sql)->execute([
            $data['title'],
            $data['type'] ?? 'direct',
            $data['property_id'] ?? null,
            $data['created_by'],
            $data['is_system_thread'] ?? false,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Add participant to conversation
     */
    public function addParticipant(int $conversationId, int $userId, string $role): bool
    {
        $sql = 'INSERT IGNORE INTO conversation_participants (conversation_id, user_id, role) 
                VALUES (?, ?, ?)';
        
        return $this->pdo->prepare($sql)->execute([$conversationId, $userId, $role]);
    }

    /**
     * Create a message
     */
    public function createMessage(array $data): int
    {
        $sql = 'INSERT INTO messages (conversation_id, sender_id, message_text, has_attachment) 
                VALUES (?, ?, ?, ?)';
        
        $this->pdo->prepare($sql)->execute([
            $data['conversation_id'],
            $data['sender_id'],
            $data['message_text'] ?? null,
            $data['has_attachment'] ?? false,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Add attachment to message
     */
    public function addAttachment(int $messageId, int $conversationId, string $fileUrl, string $fileName, string $fileType, int $fileSize, int $uploadedBy): bool
    {
        $sql = 'INSERT INTO message_attachments (message_id, conversation_id, file_url, file_name, file_type, file_size, uploaded_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?)';
        
        return $this->pdo->prepare($sql)->execute([
            $messageId,
            $conversationId,
            $fileUrl,
            $fileName,
            $fileType,
            $fileSize,
            $uploadedBy,
        ]);
    }

    /**
     * Mark messages as read
     */
    public function markAsRead(int $conversationId, int $userId): bool
    {
        $sql = 'UPDATE messages SET is_read = 1 
                WHERE conversation_id = ? AND sender_id != ? AND is_read = 0';
        
        return $this->pdo->prepare($sql)->execute([$conversationId, $userId]);
    }

    /**
     * Update participant last read time
     */
    public function updateLastRead(int $conversationId, int $userId): bool
    {
        $sql = 'UPDATE conversation_participants SET last_read_at = NOW() 
                WHERE conversation_id = ? AND user_id = ?';
        
        return $this->pdo->prepare($sql)->execute([$conversationId, $userId]);
    }

    /**
     * Get unread message count
     */
    public function getUnreadCount(int $userId): int
    {
        $sql = 'SELECT COUNT(*) as count FROM messages m
                INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
                WHERE cp.user_id = ? AND m.sender_id != ? AND m.is_read = 0';
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId, $userId]);
        $result = $stmt->fetch();
        
        return (int) ($result['count'] ?? 0);
    }

    /**
     * Search messages
     */
    public function searchMessages(int $userId, string $searchTerm): array
    {
        $sql = 'SELECT m.*, c.title as conversation_title, u.first_name, u.last_name
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                JOIN users u ON m.sender_id = u.id
                JOIN conversation_participants cp ON c.id = cp.conversation_id
                WHERE cp.user_id = ? AND m.message_text LIKE ?
                ORDER BY m.created_at DESC
                LIMIT 50';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId, "%$searchTerm%"]);
        return $stmt->fetchAll();
    }

    /**
     * Get last insert ID
     */
    public function getLastInsertId(): int
    {
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Create a welcome message conversation
     */
    public function createWelcomeConversation(int $boarderId, int $landlordId, int $propertyId, string $houseName): int
    {
        $this->pdo->beginTransaction();

        try {
            $conversationId = $this->createConversation([
                'title' => "Welcome to $houseName",
                'type' => 'welcome',
                'property_id' => $propertyId,
                'created_by' => $landlordId,
                'is_system_thread' => true,
            ]);

            $this->addParticipant($conversationId, $boarderId, 'boarder');
            $this->addParticipant($conversationId, $landlordId, 'landlord');

            $this->pdo->commit();
            return $conversationId;
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
