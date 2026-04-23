<?php

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

use App\AI\GroqService;
use App\Api\Middleware;

header('Content-Type: application/json');

try {
    // Check authentication - only landlords can analyze applications
    $user = Middleware::authenticate();
    
    if ($user['role'] !== 'landlord') {
        json_response(403, ['error' => 'Only landlords can analyze applications']);
        exit;
    }

    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['application_data'])) {
        json_response(400, ['error' => 'Application data is required']);
        exit;
    }

    // Initialize Groq service
    $groqService = new GroqService();
    
    if (!$groqService->isConfigured()) {
        json_response(503, ['error' => 'AI service not configured']);
        exit;
    }

    // Prepare prompt for AI
    $applicationData = $input['application_data'];
    $propertyRequirements = $input['property_requirements'] ?? '';
    
    $messages = [
        [
            'role' => 'system',
            'content' => 'You are a boarding house application reviewer. Analyze tenant applications '
                . 'and provide objective assessments based on the provided information. '
                . 'Highlight both positive aspects and potential concerns.'
        ],
        [
            'role' => 'user',
            'content' => "Analyze this boarding house application:\n\n"
                . "Application Data: " . json_encode($applicationData) . "\n\n"
                . "Property Requirements: {$propertyRequirements}\n\n"
                . "Provide a comprehensive analysis with these sections:\n"
                . "1. Summary: Brief overview of the applicant\n"
                . "2. Strengths: Positive aspects of the application\n"
                . "3. Concerns: Potential red flags or issues\n"
                . "4. Suitability Score: 1-10 rating with explanation\n"
                . "5. Recommendation: Approve/Reject/Need More Info with reasoning\n"
                . "6. Follow-up Questions: Suggested questions for the applicant\n\n"
                . "Return this as structured JSON."
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
            'summary' => 'Application analysis unavailable',
            'strengths' => [],
            'concerns' => [],
            'suitability_score' => 5,
            'recommendation' => 'Need manual review',
            'follow_up_questions' => []
        ];
    }
    
    json_response(200, [
        'success' => true,
        'analysis' => $parsedResponse,
        'application_id' => $input['application_id'] ?? null,
        'model_used' => $response['model'] ?? 'unknown',
        'usage' => $response['usage'] ?? null
    ]);

} catch (\Throwable $e) {
    json_response(500, [
        'error' => 'Application analysis failed: ' . $e->getMessage(),
        'success' => false
    ]);
}
