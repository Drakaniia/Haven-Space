<?php

ini_set('display_errors', 0);
header('Content-Type: application/json');

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';

use App\AI\GroqService;

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

    $messages = [
        [
            'role' => 'system',
            'content' => 'You are Haven AI, a smart boarding house assistant for the Haven Space platform. '
                . 'Your role is to help users find boarding houses, answer questions about the platform, '
                . 'and provide helpful information about rental properties. '
                . 'Be friendly, helpful, and concise. '
                . 'If you don\'t know something, say you don\'t have that information. '
                . 'Never make up property listings or specific details.'
        ],
        [
            'role' => 'user',
            'content' => $userMessage
        ]
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
