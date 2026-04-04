<?php

namespace App\Modules\Onboarding\Repositories;

use App\Core\Database\Connection;
use PDO;

/**
 * Onboarding Repository
 * Handles database operations for boarder onboarding
 */
class OnboardingRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Connection::getInstance()->getPdo();
    }

    /**
     * Get welcome message template for a landlord
     */
    public function getWelcomeTemplate(int $landlordId, ?int $propertyId = null): ?array
    {
        if ($propertyId) {
            $stmt = $this->pdo->prepare(
                'SELECT * FROM welcome_message_templates WHERE landlord_id = ? AND property_id = ? AND is_active = 1'
            );
            $stmt->execute([$landlordId, $propertyId]);
        } else {
            $stmt = $this->pdo->prepare(
                'SELECT * FROM welcome_message_templates WHERE landlord_id = ? AND property_id IS NULL AND is_active = 1'
            );
            $stmt->execute([$landlordId]);
        }

        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Create or update welcome message template
     */
    public function saveWelcomeTemplate(int $landlordId, ?int $propertyId, string $messageText): int
    {
        // Check if template exists
        $existing = $this->getWelcomeTemplate($landlordId, $propertyId);

        if ($existing) {
            $stmt = $this->pdo->prepare(
                'UPDATE welcome_message_templates SET message_text = ? WHERE id = ?'
            );
            $stmt->execute([$messageText, $existing['id']]);
            return $existing['id'];
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO welcome_message_templates (landlord_id, property_id, message_text) VALUES (?, ?, ?)'
        );
        $stmt->execute([$landlordId, $propertyId, $messageText]);
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Get landlord documents
     */
    public function getLandlordDocuments(int $landlordId, ?int $propertyId = null): array
    {
        if ($propertyId) {
            $stmt = $this->pdo->prepare(
                'SELECT * FROM landlord_documents WHERE landlord_id = ? AND property_id = ? ORDER BY created_at DESC'
            );
            $stmt->execute([$landlordId, $propertyId]);
        } else {
            $stmt = $this->pdo->prepare(
                'SELECT * FROM landlord_documents WHERE landlord_id = ? AND property_id IS NULL ORDER BY created_at DESC'
            );
            $stmt->execute([$landlordId]);
        }

        return $stmt->fetchAll();
    }

    /**
     * Get auto-send documents
     */
    public function getAutoSendDocuments(int $landlordId, ?int $propertyId = null): array
    {
        $sql = 'SELECT ld.* FROM landlord_documents ld
                INNER JOIN auto_send_documents asd ON ld.id = asd.document_id
                WHERE ld.landlord_id = ? AND asd.is_active = 1 AND ld.is_active = 1';

        if ($propertyId) {
            $sql .= ' AND (asd.property_id = ? OR asd.property_id IS NULL)';
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$landlordId, $propertyId]);
        } else {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$landlordId]);
        }

        return $stmt->fetchAll();
    }

    /**
     * Add a document
     */
    public function addDocument(array $data): int
    {
        $sql = 'INSERT INTO landlord_documents (landlord_id, property_id, document_name, document_url, document_type, category, file_size, auto_send_to_new_boarders) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

        $this->pdo->prepare($sql)->execute([
            $data['landlord_id'],
            $data['property_id'] ?? null,
            $data['document_name'],
            $data['document_url'],
            $data['document_type'],
            $data['category'] ?? 'Custom',
            $data['file_size'] ?? 0,
            $data['auto_send_to_new_boarders'] ?? false,
        ]);

        $documentId = (int) $this->pdo->lastInsertId();

        // If auto-send, add to auto_send_documents
        if (!empty($data['auto_send_to_new_boarders'])) {
            $this->toggleAutoSend($data['landlord_id'], $documentId, $data['property_id'] ?? null, true);
        }

        return $documentId;
    }

    /**
     * Toggle auto-send for a document
     */
    public function toggleAutoSend(int $landlordId, int $documentId, ?int $propertyId, bool $active): bool
    {
        if ($active) {
            $sql = 'INSERT IGNORE INTO auto_send_documents (landlord_id, document_id, property_id, is_active) 
                    VALUES (?, ?, ?, 1)';
            return $this->pdo->prepare($sql)->execute([$landlordId, $documentId, $propertyId]);
        }

        $sql = 'DELETE FROM auto_send_documents WHERE landlord_id = ? AND document_id = ?';
        if ($propertyId) {
            $sql .= ' AND property_id = ?';
            return $this->pdo->prepare($sql)->execute([$landlordId, $documentId, $propertyId]);
        }

        return $this->pdo->prepare($sql)->execute([$landlordId, $documentId]);
    }

    /**
     * Delete a document
     */
    public function deleteDocument(int $documentId, int $landlordId): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE landlord_documents SET is_active = 0 WHERE id = ? AND landlord_id = ?'
        );
        return $stmt->execute([$documentId, $landlordId]);
    }

    /**
     * Log welcome message sent
     */
    public function logWelcomeMessage(int $boarderId, int $landlordId, int $propertyId, ?int $conversationId): int
    {
        $sql = 'INSERT INTO welcome_message_logs (boarder_id, landlord_id, property_id, conversation_id, message_sent, sent_at) 
                VALUES (?, ?, ?, ?, 1, NOW())';

        $this->pdo->prepare($sql)->execute([
            $boarderId,
            $landlordId,
            $propertyId,
            $conversationId,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Get boarder documents (documents received via onboarding)
     */
    public function getBoarderDocuments(int $boarderId): array
    {
        $sql = 'SELECT ld.*, wml.sent_at as received_at, bda.acknowledged, bda.acknowledged_at
                FROM welcome_message_logs wml
                INNER JOIN landlord_documents ld ON wml.property_id = ld.property_id OR wml.landlord_id = ld.landlord_id
                LEFT JOIN boarder_document_acknowledgments bda ON ld.id = bda.document_id AND bda.boarder_id = ?
                WHERE wml.boarder_id = ? AND ld.is_active = 1
                ORDER BY wml.sent_at DESC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$boarderId, $boarderId]);
        return $stmt->fetchAll();
    }

    /**
     * Acknowledge document receipt
     */
    public function acknowledgeDocument(int $boarderId, int $documentId): bool
    {
        $sql = 'INSERT INTO boarder_document_acknowledgments (boarder_id, document_id, acknowledged, acknowledged_at) 
                VALUES (?, ?, 1, NOW())
                ON DUPLICATE KEY UPDATE acknowledged = 1, acknowledged_at = NOW()';

        return $this->pdo->prepare($sql)->execute([$boarderId, $documentId]);
    }
}
