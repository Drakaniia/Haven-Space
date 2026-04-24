<?php

ini_set('display_errors', 0);
header('Content-Type: application/json');

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';

// CORS is handled by cors.php middleware

use App\AI\GroqService;
use App\AI\PropertyService;

try {
    // Allow public access to AI chat - no authentication required
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['message'])) {
        json_response(400, ['error' => 'Message is required']);
        exit;
    }

    $groqService = new GroqService();

    if (!$groqService->isConfigured()) {
        json_response(503, ['error' => 'AI service not configured']);
        exit;
    }

    $userMessage = $input['message'];

    // Check if this is a property-related query and enhance with real-time data
    $propertyService = new PropertyService();
    $isPropertyQuery = $propertyService->isPropertyRelatedQuery($userMessage);
    
    $systemMessage = 'You are Haven AI, a smart boarding house assistant for the Haven Space platform. '
        . 'Your role is to help users find boarding houses, answer questions about the platform, '
        . 'and provide helpful information about rental properties. '
        . 'Be friendly, helpful, and concise. '
        . 'If you don\'t know something, say you don\'t have that information. '
        . 'Never make up property listings or specific details.';
    
    $messages = [
        [
            'role' => 'system',
            'content' => $systemMessage
        ]
    ];
    
    // Add real-time property data if it's a property-related query
    if ($isPropertyQuery) {
        $properties = $propertyService->getActivePropertiesForAI();
        $propertyContext = $propertyService->formatPropertiesForAIContext($properties);
        
        $messages[] = [
            'role' => 'system',
            'content' => 'Current property listings (real-time data):

' . $propertyContext . '

' . 
                'When answering property-related questions, use this up-to-date information. '
                . 'If no properties match the user\'s criteria, suggest they check back later or adjust their search.'
        ];
    }
    
    $messages[] = [
        'role' => 'user',
        'content' => $userMessage
    ];

    $response = $groqService->chatCompletion($messages);
    $aiResponse = $response['choices'][0]['message']['content'] ?? '';

    json_response(200, [
        'success' => true,
        'response' => trim($aiResponse),
        'model_used' => $response['model'] ?? 'unknown',
        'usage' => $response['usage'] ?? null
    ]);

} catch (\Throwable $e) {
    json_response(500, [
        'error' => 'AI chat failed: ' . $e->getMessage(),
        'success' => false
    ]);
}
