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
             INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
             WHERE c.id = :conversation_id AND cp.user_id = :user_id AND cp.is_active = 1'
        );
        $stmt->bindValue(':conversation_id', $conversationId, PDO::PARAM_INT);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $conversation = $stmt->fetch();

        if (!$conversation) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT cp.*, u.first_name, u.last_name, u.email
             FROM conversation_participants cp
             JOIN users u ON cp.user_id = u.id
             WHERE cp.conversation_id = :conversation_id'
        );
        $stmt->bindValue(':conversation_id', $conversationId, PDO::PARAM_INT);
        $stmt->execute();
        $conversation['participants'] = $stmt->fetchAll();

        return $conversation;
    }

    /**
     * Get messages for a conversation
     */
    public function getConversationMessages(int $conversationId, int $limit = 50, int $offset = 0): array
    {
        $sql = 'SELECT m.*, CONCAT(u.first_name, " ", u.last_name) as sender_name
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.conversation_id = :conversation_id
                ORDER BY m.created_at DESC
                LIMIT :limit OFFSET :offset';

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':conversation_id', $conversationId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', (int) $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int) $offset, PDO::PARAM_INT);
        $stmt->execute();
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
                VALUES (:title, :type, :property_id, :created_by, :is_system_thread)';
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':title', $data['title']);
        $stmt->bindValue(':type', $data['type'] ?? 'direct');
        $stmt->bindValue(':property_id', $data['property_id'] ?? null, PDO::PARAM_INT);
        $stmt->bindValue(':created_by', $data['created_by'], PDO::PARAM_INT);
        $stmt->bindValue(':is_system_thread', (int)($data['is_system_thread'] ?? false), PDO::PARAM_INT);
        $stmt->execute();

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Add participant to conversation
     */
    public function addParticipant(int $conversationId, int $userId, string $role): bool
    {
        $sql = 'INSERT IGNORE INTO conversation_participants (conversation_id, user_id, role) 
                VALUES (:conversation_id, :user_id, :role)';
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':conversation_id', $conversationId, PDO::PARAM_INT);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':role', $role);
        return $stmt->execute();
    }

    /**
     * Create a message
     */
    public function createMessage(array $data): int
    {
        $sql = 'INSERT INTO messages (conversation_id, sender_id, message_text, has_attachment) 
                VALUES (:conversation_id, :sender_id, :message_text, :has_attachment)';
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':conversation_id', $data['conversation_id'], PDO::PARAM_INT);
        $stmt->bindValue(':sender_id', $data['sender_id'], PDO::PARAM_INT);
        $stmt->bindValue(':message_text', $data['message_text'] ?? null);
        $stmt->bindValue(':has_attachment', (int) ($data['has_attachment'] ?? false), PDO::PARAM_INT);
        $stmt->execute();

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Add attachment to message
     */
    public function addAttachment(int $messageId, int $conversationId, string $fileUrl, string $fileName, string $fileType, int $fileSize, int $uploadedBy): bool
    {
        $sql = 'INSERT INTO message_attachments (message_id, conversation_id, file_url, file_name, file_type, file_size, uploaded_by) 
                VALUES (:message_id, :conversation_id, :file_url, :file_name, :file_type, :file_size, :uploaded_by)';
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':message_id', $messageId, PDO::PARAM_INT);
        $stmt->bindValue(':conversation_id', $conversationId, PDO::PARAM_INT);
        $stmt->bindValue(':file_url', $fileUrl);
        $stmt->bindValue(':file_name', $fileName);
        $stmt->bindValue(':file_type', $fileType);
        $stmt->bindValue(':file_size', $fileSize, PDO::PARAM_INT);
        $stmt->bindValue(':uploaded_by', $uploadedBy, PDO::PARAM_INT);
        return $stmt->execute();
    }

    /**
     * Mark messages as read
     */
    public function markAsRead(int $conversationId, int $userId): bool
    {
        $sql = 'UPDATE messages SET is_read = 1 
                WHERE conversation_id = :conversation_id AND sender_id != :user_id AND is_read = 0';
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':conversation_id', $conversationId, PDO::PARAM_INT);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        return $stmt->execute();
    }

    /**
     * Update participant last read time
     */
    public function updateLastRead(int $conversationId, int $userId): bool
    {
        $sql = 'UPDATE conversation_participants SET last_read_at = NOW() 
                WHERE conversation_id = :conversation_id AND user_id = :user_id';
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':conversation_id', $conversationId, PDO::PARAM_INT);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        return $stmt->execute();
    }

    /**
     * Get unread message count
     */
    public function getUnreadCount(int $userId): int
    {
        $sql = 'SELECT COUNT(*) as count FROM messages m
                INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
                WHERE cp.user_id = :user_id AND m.sender_id != :user_id_2 AND m.is_read = 0';
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':user_id_2', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch();
        
        return (int) ($result['count'] ?? 0);
    }

    /**
     * Search messages
     */
    public function searchMessages(int $userId, string $searchTerm): array
    {
        $sql = 'SELECT m.*, c.title as conversation_title, CONCAT(u.first_name, " ", u.last_name) as sender_name
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
     * Find a direct conversation between two users
     */
    public function findDirectConversation(int $user1Id, int $user2Id): ?int
    {
        $sql = 'SELECT cp1.conversation_id 
                FROM conversation_participants cp1
                JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
                JOIN conversations c ON cp1.conversation_id = c.id
                WHERE cp1.user_id = ? AND cp2.user_id = ? AND c.type = "direct"
                LIMIT 1';
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$user1Id, $user2Id]);
        $result = $stmt->fetch();
        
        return $result ? (int)$result['conversation_id'] : null;
    }

    /**
     * Get user details
     */
    public function getUserDetails(int $userId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT id, first_name, last_name, role FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $result = $stmt->fetch();
        return $result ?: null;
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
