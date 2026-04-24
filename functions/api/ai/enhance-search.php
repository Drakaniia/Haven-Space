<?php

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

use App\AI\GroqService;
use App\Api\Middleware;

header('Content-Type: application/json');

try {
    // Authentication is optional for search enhancement (public feature)
    $user = null;
    try {
        $user = Middleware::authenticate();
    } catch (\Throwable $e) {
        // Continue without authentication for public searches
    }

    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['query'])) {
        json_response(400, ['error' => 'Search query is required']);
        exit;
    }

    // Initialize Groq service
    $groqService = new GroqService();
    
    if (!$groqService->isConfigured()) {
        // Fallback - return original query if AI not configured
        json_response(200, [
            'success' => true,
            'enhanced_query' => $input['query'],
            'keywords' => [$input['query']],
            'ai_enhanced' => false
        ]);
        exit;
    }

    // Prepare prompt for AI
    $query = $input['query'];
    $location = $input['location'] ?? 'not specified';
    $budget = $input['budget'] ?? 'not specified';
    
    $messages = [
        [
            'role' => 'system',
            'content' => 'You are a real estate search assistant. Analyze user search queries '
                . 'and extract key requirements, preferences, and intent. Return structured data '
                . 'that can be used to enhance database searches.'
        ],
        [
            'role' => 'user',
            'content' => "Analyze this search query and extract relevant information:\n\n"
                . "Query: {$query}\n"
                . "Location: {$location}\n"
                . "Budget: {$budget}\n\n"
                . "Return JSON with fields: keywords (array), location_hints (array), "
                . "price_range (object with min/max), amenities (array), "
                . "property_type_hints (array), and intent (string)"
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
            'keywords' => [$query],
            'location_hints' => [strtolower($location)],
            'price_range' => ['min' => null, 'max' => null],
            'amenities' => [],
            'property_type_hints' => [],
            'intent' => 'general search'
        ];
    }
    
    json_response(200, [
        'success' => true,
        'enhanced_query' => $query,
        'ai_analysis' => $parsedResponse,
        'ai_enhanced' => true,
        'model_used' => $response['model'] ?? 'unknown',
        'usage' => $response['usage'] ?? null
    ]);

} catch (\Throwable $e) {
    json_response(500, [
        'error' => 'Search enhancement failed: ' . $e->getMessage(),
        'success' => false
    ]);
}
