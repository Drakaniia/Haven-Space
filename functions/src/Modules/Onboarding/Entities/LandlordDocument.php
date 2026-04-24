<?php

namespace App\Modules\Onboarding\Entities;

/**
 * Landlord Document Entity
 */
class LandlordDocument
{
    public ?int $id;
    public int $landlordId;
    public ?int $propertyId;
    public string $documentName;
    public string $documentUrl;
    public string $documentType;
    public string $category;
    public int $fileSize;
    public int $version;
    public bool $isActive;
    public bool $autoSendToNewBoarders;
    public ?string $createdAt;
    public ?string $updatedAt;

    public function __construct(array $data = [])
    {
        $this->id = $data['id'] ?? null;
        $this->landlordId = $data['landlord_id'] ?? 0;
        $this->propertyId = $data['property_id'] ?? null;
        $this->documentName = $data['document_name'] ?? '';
        $this->documentUrl = $data['document_url'] ?? '';
        $this->documentType = $data['document_type'] ?? '';
        $this->category = $data['category'] ?? 'Custom';
        $this->fileSize = (int) ($data['file_size'] ?? 0);
        $this->version = (int) ($data['version'] ?? 1);
        $this->isActive = (bool) ($data['is_active'] ?? true);
        $this->autoSendToNewBoarders = (bool) ($data['auto_send_to_new_boarders'] ?? false);
        $this->createdAt = $data['created_at'] ?? null;
        $this->updatedAt = $data['updated_at'] ?? null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'landlord_id' => $this->landlordId,
            'property_id' => $this->propertyId,
            'document_name' => $this->documentName,
            'document_url' => $this->documentUrl,
            'document_type' => $this->documentType,
            'category' => $this->category,
            'file_size' => $this->fileSize,
            'version' => $this->version,
            'is_active' => $this->isActive,
            'auto_send_to_new_boarders' => $this->autoSendToNewBoarders,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'document_name' => $this->documentName,
            'document_url' => $this->documentUrl,
            'document_type' => $this->documentType,
            'category' => $this->category,
            'file_size' => $this->fileSize,
            'version' => $this->version,
            'auto_send_to_new_boarders' => $this->autoSendToNewBoarders,
            'created_at' => $this->createdAt,
        ];
    }
}
