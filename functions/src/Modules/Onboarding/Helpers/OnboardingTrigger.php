<?php

namespace App\Modules\Onboarding\Helpers;

use App\Modules\Onboarding\Services\OnboardingService;

/**
 * Onboarding Trigger Helper
 * Called when a boarder's application is accepted
 */
class OnboardingTrigger
{
    /**
     * Trigger welcome flow when application is accepted
     * 
     * @param int $boarderId The boarder's user ID
     * @param int $landlordId The landlord's user ID
     * @param int $propertyId The property ID
     * @param string $houseName The boarding house name
     * @param string|null $customMessage Optional custom welcome message
     * @return int Conversation ID created
     */
    public static function onApplicationAccepted(
        int $boarderId,
        int $landlordId,
        int $propertyId,
        string $houseName,
        ?string $customMessage = null
    ): int {
        try {
            $service = new OnboardingService();
            
            $conversationId = $service->triggerWelcomeFlow(
                $boarderId,
                $landlordId,
                $propertyId,
                $houseName,
                $customMessage
            );

            // Log the action
            error_log("Welcome flow triggered for boarder {$boarderId}, property {$propertyId}, conversation {$conversationId}");

            return $conversationId;
        } catch (\Exception $e) {
            error_log("Failed to trigger welcome flow: " . $e->getMessage());
            throw $e;
        }
    }
}
