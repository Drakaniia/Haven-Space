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
    
    if (empty($input['context'])) {
        json_response(400, ['error' => 'Message context is required']);
        exit;
    }

    // Initialize Groq service
    $groqService = new GroqService();
    
    if (!$groqService->isConfigured()) {
        json_response(503, ['error' => 'AI service not configured']);
        exit;
    }

    // Prepare prompt for AI
    $context = $input['context'];
    $recipientRole = $input['recipient_role'] ?? 'unknown';
    $senderRole = $user['role'] ?? 'user';
    $tone = $input['tone'] ?? 'professional';
    $messageType = $input['message_type'] ?? 'general';
    
    $systemPrompt = 'You are a helpful messaging assistant for a boarding house management platform. '
        . 'Draft appropriate messages based on the given context, considering the relationship '
        . 'between sender and recipient.';

    $userPrompt = "Draft a {$tone} message from a {$senderRole} to a {$recipientRole} about: {$messageType}.\n\n"
        . "Context: {$context}\n\n"
        . "Provide 3 alternative versions with different tones: professional, friendly, and concise.\n"
        . "Return JSON with fields: subject (string), alternatives (array of objects with tone and content)";

    $messages = [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $userPrompt]
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
            'subject' => 'Regarding your message',
            'alternatives' => [
                [
                    'tone' => 'professional',
                    'content' => 'Dear [Recipient], I hope this message finds you well. ' . $context
                ],
                [
                    'tone' => 'friendly',
                    'content' => 'Hi there! Just wanted to reach out about ' . $context
                ],
                [
                    'tone' => 'concise',
                    'content' => $context
                ]
            ]
        ];
    }
    
    json_response(200, [
        'success' => true,
        'message_drafts' => $parsedResponse,
        'context_used' => $context,
        'model_used' => $response['model'] ?? 'unknown',
        'usage' => $response['usage'] ?? null
    ]);

} catch (\Throwable $e) {
    json_response(500, [
        'error' => 'Message drafting failed: ' . $e->getMessage(),
        'success' => false
    ]);
}
