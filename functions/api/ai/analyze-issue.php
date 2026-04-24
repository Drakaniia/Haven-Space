<?php

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

use App\AI\GroqService;
use App\Api\Middleware;

header('Content-Type: application/json');

try {
    // Check authentication
    $user = Middleware::authenticate();

    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['issue_description'])) {
        json_response(400, ['error' => 'Issue description is required']);
        exit;
    }

    // Initialize Groq service
    $groqService = new GroqService();
    
    if (!$groqService->isConfigured()) {
        json_response(503, ['error' => 'AI service not configured']);
        exit;
    }

    // Prepare prompt for AI
    $issueDescription = $input['issue_description'];
    $propertyType = $input['property_type'] ?? 'boarding house';
    $location = $input['location'] ?? 'unknown';
    
    $messages = [
        [
            'role' => 'system',
            'content' => 'You are a maintenance request analyzer for boarding houses and rental properties. '
                . 'Analyze maintenance issues, categorize them, suggest urgency levels, and provide '
                . 'helpful information for both tenants and landlords.'
        ],
        [
            'role' => 'user',
            'content' => "Analyze this maintenance issue:\n\n"
                . "Issue: {$issueDescription}\n"
                . "Property Type: {$propertyType}\n"
                . "Location: {$location}\n\n"
                . "Return JSON with fields: category (string), urgency (low/medium/high), "
                . "suggested_title (string), additional_info_needed (array), "
                . "tenant_tips (array), landlord_notes (array), estimated_resolution_time (string)"
        ]
    ];

    // Call Groq API
    $response = $groqService->chatCompletion($messages);
    
    // Extract and parse the response
    $aiResponse = $response['choices'][0]['message']['content'] ?? '{}';
    
    // Try to parse JSON response from AI
    $parsedResponse = json_decode($aiResponse, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        // Fallback if AI doesn't return valid JSON
        $parsedResponse = [
            'category' => 'general',
            'urgency' => 'medium',
            'suggested_title' => substr($issueDescription, 0, 50) . '...',
            'additional_info_needed' => [],
            'tenant_tips' => ['Please provide photos if possible'],
            'landlord_notes' => ['Requires professional assessment'],
            'estimated_resolution_time' => '1-3 days'
        ];
    }
    
    json_response(200, [
        'success' => true,
        'analysis' => $parsedResponse,
        'original_issue' => $issueDescription,
        'model_used' => $response['model'] ?? 'unknown',
        'usage' => $response['usage'] ?? null
    ]);

} catch (\Throwable $e) {
    json_response(500, [
        'error' => 'Issue analysis failed: ' . $e->getMessage(),
        'success' => false
    ]);
}
