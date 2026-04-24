<?php

namespace App\Modules\Onboarding\Services;

use App\Modules\Onboarding\Repositories\OnboardingRepository;
use App\Modules\Onboarding\Entities\WelcomeMessageTemplate;
use App\Modules\Onboarding\Entities\LandlordDocument;
use App\Modules\Message\Services\MessageService;
use App\Core\Upload\UploadHandler;

/**
 * Onboarding Service
 * Business logic for boarder onboarding operations
 */
class OnboardingService
{
    private OnboardingRepository $repository;
    private MessageService $messageService;
    private UploadHandler $uploadHandler;

    public function __construct()
    {
        $this->repository = new OnboardingRepository();
        $this->messageService = new MessageService();
        $this->uploadHandler = new UploadHandler();
    }

    /**
     * Get welcome message template for landlord
     */
    public function getWelcomeTemplate(int $landlordId, ?int $propertyId = null): ?array
    {
        $template = $this->repository->getWelcomeTemplate($landlordId, $propertyId);

        if (!$template) {
            return null;
        }

        $entity = new WelcomeMessageTemplate($template);
        return $entity->toArray();
    }

    /**
     * Save welcome message template
     */
    public function saveWelcomeTemplate(int $landlordId, ?int $propertyId, string $messageText): array
    {
        if (empty(trim($messageText))) {
            throw new \InvalidArgumentException('Message text cannot be empty');
        }

        $id = $this->repository->saveWelcomeTemplate($landlordId, $propertyId, $messageText);

        return $this->getWelcomeTemplate($landlordId, $propertyId);
    }

    /**
     * Get landlord documents
     */
    public function getLandlordDocuments(int $landlordId, ?int $propertyId = null): array
    {
        $documents = $this->repository->getLandlordDocuments($landlordId, $propertyId);

        return array_map(function ($doc) {
            $entity = new LandlordDocument($doc);
            return $entity->toPublicArray();
        }, $documents);
    }

    /**
     * Add a document
     */
    public function addDocument(array $data, array $file, int $landlordId): array
    {
        // Validate file
        $fileUrl = $this->uploadHandler->upload($file, 'onboarding');
        if (!$fileUrl) {
            $errors = $this->uploadHandler->getErrors();
            throw new \RuntimeException($errors[0] ?? 'File upload failed');
        }

        $data['landlord_id'] = $landlordId;
        $data['document_url'] = $fileUrl;
        $data['document_name'] = $file['name'];
        $data['document_type'] = $file['type'];
        $data['file_size'] = $file['size'];

        $id = $this->repository->addDocument($data);

        return $this->getDocument($id, $landlordId);
    }

    /**
     * Get a single document
     */
    public function getDocument(int $documentId, int $landlordId): ?array
    {
        $documents = $this->repository->getLandlordDocuments($landlordId);

        foreach ($documents as $doc) {
            if ($doc['id'] == $documentId) {
                $entity = new LandlordDocument($doc);
                return $entity->toPublicArray();
            }
        }

        return null;
    }

    /**
     * Toggle auto-send for a document
     */
    public function toggleAutoSend(int $landlordId, int $documentId, ?int $propertyId, bool $active): bool
    {
        return $this->repository->toggleAutoSend($landlordId, $documentId, $propertyId, $active);
    }

    /**
     * Delete a document
     */
    public function deleteDocument(int $documentId, int $landlordId): bool
    {
        return $this->repository->deleteDocument($documentId, $landlordId);
    }

    /**
     * Get auto-send documents
     */
    public function getAutoSendDocuments(int $landlordId, ?int $propertyId = null): array
    {
        $documents = $this->repository->getAutoSendDocuments($landlordId, $propertyId);

        return array_map(function ($doc) {
            $entity = new LandlordDocument($doc);
            return $entity->toPublicArray();
        }, $documents);
    }

    /**
     * Trigger welcome flow when boarder is accepted
     */
    public function triggerWelcomeFlow(int $boarderId, int $landlordId, int $propertyId, string $houseName, ?string $customMessage = null): int
    {
        // Get welcome message and house rules from landlord profile
        $pdo = \App\Core\Database\Database::getInstance()->getConnection();
        $stmt = $pdo->prepare('
            SELECT welcome_message, house_rules_file_url, house_rules_file_name, house_rules_file_size
            FROM landlord_profiles
            WHERE user_id = ?
        ');
        $stmt->execute([$landlordId]);
        $landlordSettings = $stmt->fetch(\PDO::FETCH_ASSOC);

        $welcomeMessage = $customMessage;
        if (!$welcomeMessage && $landlordSettings && $landlordSettings['welcome_message']) {
            // Process template variables
            $welcomeMessage = $this->processTemplateVariables($landlordSettings['welcome_message'], $boarderId, $houseName);
        }

        if (!$welcomeMessage) {
            $welcomeMessage = "Welcome to $houseName! We're excited to have you join our community.";
        }

        // Prepare house rules document if available
        $documents = [];
        if ($landlordSettings && $landlordSettings['house_rules_file_url']) {
            $documents[] = [
                'document_url' => $landlordSettings['house_rules_file_url'],
                'document_name' => $landlordSettings['house_rules_file_name'] ?? 'House Rules',
                'document_type' => 'application/pdf',
                'file_size' => $landlordSettings['house_rules_file_size'] ?? 0,
            ];
        }

        // Also get any auto-send documents from the old system (for backward compatibility)
        $autoSendDocs = $this->repository->getAutoSendDocuments($landlordId, $propertyId);
        $documents = array_merge($documents, $autoSendDocs);

        // Create welcome conversation
        $conversationId = $this->messageService->createWelcomeConversation(
            $boarderId,
            $landlordId,
            $propertyId,
            $houseName,
            $welcomeMessage,
            $documents
        );

        // Log the welcome message
        $this->repository->logWelcomeMessage($boarderId, $landlordId, $propertyId, $conversationId);

        return $conversationId;
    }

    /**
     * Process template variables
     */
    private function processTemplateVariables(string $template, int $boarderId, string $houseName): string
    {
        // Get boarder info from users table
        $pdo = \App\Core\Database\Database::getInstance()->getConnection();
        $stmt = $pdo->prepare('SELECT first_name, last_name FROM users WHERE id = ?');
        $stmt->execute([$boarderId]);
        $boarder = $stmt->fetch(\PDO::FETCH_ASSOC);

        $variables = [
            '{boarder_name}' => $boarder['first_name'] ?? 'Boarder',
            '{house_name}' => $houseName,
            '{move_in_date}' => date('F j, Y'),
            '{room_number}' => 'TBD',
        ];

        return str_replace(array_keys($variables), array_values($variables), $template);
    }

    /**
     * Get boarder documents
     */
    public function getBoarderDocuments(int $boarderId): array
    {
        $documents = $this->repository->getBoarderDocuments($boarderId);

        return array_map(function ($doc) {
            return [
                'id' => $doc['id'],
                'document_name' => $doc['document_name'],
                'document_url' => $doc['document_url'],
                'document_type' => $doc['document_type'],
                'category' => $doc['category'],
                'file_size' => $doc['file_size'],
                'received_at' => $doc['received_at'],
                'acknowledged' => (bool) $doc['acknowledged'],
                'acknowledged_at' => $doc['acknowledged_at'],
            ];
        }, $documents);
    }

    /**
     * Acknowledge document receipt
     */
    public function acknowledgeDocument(int $boarderId, int $documentId): bool
    {
        return $this->repository->acknowledgeDocument($boarderId, $documentId);
    }
}
