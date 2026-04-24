<?php

namespace App\Modules\Onboarding\Entities;

/**
 * Welcome Message Template Entity
 */
class WelcomeMessageTemplate
{
    public ?int $id;
    public int $landlordId;
    public ?int $propertyId;
    public string $messageText;
    public bool $isActive;
    public ?string $createdAt;
    public ?string $updatedAt;

    public function __construct(array $data = [])
    {
        $this->id = $data['id'] ?? null;
        $this->landlordId = $data['landlord_id'] ?? 0;
        $this->propertyId = $data['property_id'] ?? null;
        $this->messageText = $data['message_text'] ?? '';
        $this->isActive = (bool) ($data['is_active'] ?? true);
        $this->createdAt = $data['created_at'] ?? null;
        $this->updatedAt = $data['updated_at'] ?? null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'landlord_id' => $this->landlordId,
            'property_id' => $this->propertyId,
            'message_text' => $this->messageText,
            'is_active' => $this->isActive,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }
}
