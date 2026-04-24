<?php

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

use App\AI\GroqService;
use App\Api\Middleware;

header('Content-Type: application/json');

try {
    // Check authentication - only landlords can generate descriptions
    $user = Middleware::authenticate();
    
    if ($user['role'] !== 'landlord') {
        json_response(403, ['error' => 'Only landlords can generate property descriptions']);
        exit;
    }

    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['property_details'])) {
        json_response(400, ['error' => 'Property details are required']);
        exit;
    }

    // Initialize Groq service
    $groqService = new GroqService();
    
    if (!$groqService->isConfigured()) {
        json_response(503, ['error' => 'AI service not configured']);
        exit;
    }

    // Prepare prompt for AI
    $propertyDetails = $input['property_details'];
    
    $messages = [
        [
            'role' => 'system',
            'content' => 'You are a professional real estate agent specializing in boarding houses and rental properties. '
                . 'Generate compelling, detailed property descriptions that highlight the best features '
                . 'while being honest and accurate. Use a friendly, welcoming tone.'
        ],
        [
            'role' => 'user',
            'content' => 'Create an engaging property description for a boarding house with these features: '
                . json_encode($propertyDetails)
        ]
    ];

    // Call Groq API
    $response = $groqService->chatCompletion($messages);
    
    // Extract and return the generated description
    $description = $response['choices'][0]['message']['content'] ?? '';
    
    json_response(200, [
        'success' => true,
        'description' => trim($description),
        'model_used' => $response['model'] ?? 'unknown',
        'usage' => $response['usage'] ?? null
    ]);

} catch (\Throwable $e) {
    json_response(500, [
        'error' => 'Failed to generate description: ' . $e->getMessage(),
        'success' => false
    ]);
}
