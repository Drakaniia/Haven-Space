<?php

namespace App\Modules\Maintenance\Entities;

/**
 * Maintenance Comment Entity
 */
class MaintenanceComment
{
    public ?int $id;
    public int $requestId;
    public int $userId;
    public string $userType;
    public string $comment;
    public ?array $images;
    public bool $isSystemNote;
    public ?string $createdAt;

    public function __construct(array $data = [])
    {
        $this->id = $data['id'] ?? null;
        $this->requestId = $data['request_id'] ?? 0;
        $this->userId = $data['user_id'] ?? 0;
        $this->userType = $data['user_type'] ?? 'boarder';
        $this->comment = $data['comment'] ?? '';
        $this->images = isset($data['images']) ? json_decode($data['images'], true) : [];
        $this->isSystemNote = (bool) ($data['is_system_note'] ?? false);
        $this->createdAt = $data['created_at'] ?? null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'request_id' => $this->requestId,
            'user_id' => $this->userId,
            'user_type' => $this->userType,
            'comment' => $this->comment,
            'images' => $this->images,
            'is_system_note' => $this->isSystemNote,
            'created_at' => $this->createdAt,
        ];
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'user_type' => $this->userType,
            'comment' => $this->comment,
            'images' => $this->images,
            'is_system_note' => $this->isSystemNote,
            'created_at' => $this->createdAt,
        ];
    }
}
