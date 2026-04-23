<?php

// Test script for AI chat endpoint
require_once __DIR__ . '/server/src/Core/bootstrap.php';
require_once __DIR__ . '/server/src/Shared/Helpers/ResponseHelper.php';

use App\AI\GroqService;

try {
    // Test Groq service configuration
    $groqService = new GroqService();
    
    if (!$groqService->isConfigured()) {
        echo "AI service not configured\n";
        echo "GROQ_API_KEY: " . (getenv('GROQ_API_KEY') ? 'SET' : 'NOT SET') . "\n";
        echo "GROQ_BASE_URL: " . (getenv('GROQ_BASE_URL') ? 'SET' : 'NOT SET') . "\n";
        exit(1);
    }
    
    echo "AI service is configured\n";
    
    // Test a simple chat request
    $messages = [
        [
            'role' => 'system',
            'content' => 'You are Haven AI, a smart boarding house assistant.'
        ],
        [
            'role' => 'user',
            'content' => 'Hello, can you help me find a boarding house?'
        ]
    ];
    
    $response = $groqService->chatCompletion($messages);
    
    if (isset($response['choices'][0]['message']['content'])) {
        echo "AI Response: " . $response['choices'][0]['message']['content'] . "\n";
        echo "Model: " . ($response['model'] ?? 'unknown') . "\n";
        echo "Success!\n";
    } else {
        echo "Unexpected response format\n";
        print_r($response);
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}