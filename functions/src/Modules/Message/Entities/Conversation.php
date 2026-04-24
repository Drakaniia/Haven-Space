<?php

namespace App\Modules\Message\Entities;

/**
 * Conversation Entity
 */
class Conversation
{
    public ?int $id;
    public string $title;
    public string $type;
    public ?int $propertyId;
    public int $createdBy;
    public bool $isSystemThread;
    public ?string $createdAt;
    public ?string $updatedAt;
    public ?array $participants;
    public ?string $lastMessage;
    public ?string $lastMessageAt;
    public int $unreadCount;

    public function __construct(array $data = [])
    {
        $this->id = $data['id'] ?? null;
        $this->title = $data['title'] ?? '';
        $this->type = $data['type'] ?? 'direct';
        $this->propertyId = $data['property_id'] ?? null;
        $this->createdBy = $data['created_by'] ?? 0;
        $this->isSystemThread = (bool) ($data['is_system_thread'] ?? false);
        $this->createdAt = $data['created_at'] ?? null;
        $this->updatedAt = $data['updated_at'] ?? null;
        $this->participants = $data['participants'] ?? [];
        $this->lastMessage = $data['last_message'] ?? null;
        $this->lastMessageAt = $data['last_message_at'] ?? null;
        $this->unreadCount = (int) ($data['unread_count'] ?? 0);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'type' => $this->type,
            'property_id' => $this->propertyId,
            'created_by' => $this->createdBy,
            'is_system_thread' => $this->isSystemThread,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'type' => $this->type,
            'is_system_thread' => $this->isSystemThread,
            'participants' => $this->participants,
            'last_message' => $this->lastMessage,
            'last_message_at' => $this->lastMessageAt,
            'unread_count' => $this->unreadCount,
            'created_at' => $this->createdAt,
        ];
    }
}
