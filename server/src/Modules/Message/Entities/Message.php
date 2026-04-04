<?php

namespace App\Modules\Message\Entities;

/**
 * Message Entity
 */
class Message
{
    public ?int $id;
    public int $conversationId;
    public int $senderId;
    public ?string $messageText;
    public bool $hasAttachment;
    public bool $isRead;
    public ?string $createdAt;
    public ?array $attachments;
    public ?string $senderName;

    public function __construct(array $data = [])
    {
        $this->id = $data['id'] ?? null;
        $this->conversationId = $data['conversation_id'] ?? 0;
        $this->senderId = $data['sender_id'] ?? 0;
        $this->messageText = $data['message_text'] ?? null;
        $this->hasAttachment = (bool) ($data['has_attachment'] ?? false);
        $this->isRead = (bool) ($data['is_read'] ?? false);
        $this->createdAt = $data['created_at'] ?? null;
        $this->attachments = $data['attachments'] ?? [];
        $this->senderName = $data['sender_name'] ?? null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'conversation_id' => $this->conversationId,
            'sender_id' => $this->senderId,
            'message_text' => $this->messageText,
            'has_attachment' => $this->hasAttachment,
            'is_read' => $this->isRead,
            'created_at' => $this->createdAt,
        ];
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'sender_id' => $this->senderId,
            'sender_name' => $this->senderName,
            'message_text' => $this->messageText,
            'has_attachment' => $this->hasAttachment,
            'attachments' => $this->attachments,
            'is_read' => $this->isRead,
            'created_at' => $this->createdAt,
        ];
    }
}
