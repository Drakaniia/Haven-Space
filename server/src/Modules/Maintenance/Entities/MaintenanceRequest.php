<?php

namespace App\Modules\Maintenance\Entities;

/**
 * Maintenance Request Entity
 */
class MaintenanceRequest
{
    public ?int $id;
    public int $boarderId;
    public int $landlordId;
    public ?int $propertyId;
    public ?int $roomId;
    public string $title;
    public string $description;
    public string $category;
    public string $priority;
    public string $status;
    public ?array $images;
    public ?int $assignedTo;
    public ?string $createdAt;
    public ?string $updatedAt;
    public ?string $resolvedAt;

    public function __construct(array $data = [])
    {
        $this->id = $data['id'] ?? null;
        $this->boarderId = $data['boarder_id'] ?? 0;
        $this->landlordId = $data['landlord_id'] ?? 0;
        $this->propertyId = $data['property_id'] ?? null;
        $this->roomId = $data['room_id'] ?? null;
        $this->title = $data['title'] ?? '';
        $this->description = $data['description'] ?? '';
        $this->category = $data['category'] ?? 'Other';
        $this->priority = $data['priority'] ?? 'Medium';
        $this->status = $data['status'] ?? 'Pending';
        $this->images = isset($data['images']) ? json_decode($data['images'], true) : [];
        $this->assignedTo = $data['assigned_to'] ?? null;
        $this->createdAt = $data['created_at'] ?? null;
        $this->updatedAt = $data['updated_at'] ?? null;
        $this->resolvedAt = $data['resolved_at'] ?? null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'boarder_id' => $this->boarderId,
            'landlord_id' => $this->landlordId,
            'property_id' => $this->propertyId,
            'room_id' => $this->roomId,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'priority' => $this->priority,
            'status' => $this->status,
            'images' => $this->images,
            'assigned_to' => $this->assignedTo,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
            'resolved_at' => $this->resolvedAt,
        ];
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'category' => $this->category,
            'priority' => $this->priority,
            'status' => $this->status,
            'images' => $this->images,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
            'resolved_at' => $this->resolvedAt,
        ];
    }
}
