<?php

namespace App\AI;

class GroqService
{
    private $apiKey;
    private $baseUrl;
    private $defaultModel;

    public function __construct()
    {
        $this->apiKey = getenv('GROQ_API_KEY');
        $this->baseUrl = getenv('GROQ_BASE_URL');
        $this->defaultModel = getenv('GROQ_DEFAULT_MODEL');
    }

    /**
     * Generate text completion using Groq AI
     *
     * @param array $messages Array of message objects with 'role' and 'content'
     * @param string|null $model Specific model to use, or null for default
     * @param float $temperature Creativity level (0.0-1.0)
     * @param int $maxTokens Maximum tokens to generate
     * @return array API response with generated text
     * @throws \Exception When API request fails
     */
    public function chatCompletion(array $messages, string $model = null, float $temperature = 0.7, int $maxTokens = 1024): array
    {
        $url = $this->baseUrl . '/chat/completions';
        
        $data = [
            'model' => $model ?? $this->defaultModel,
            'messages' => $messages,
            'temperature' => $temperature,
            'max_tokens' => $maxTokens
        ];

        return $this->makeRequest('POST', $url, $data);
    }

    /**
     * List available models from Groq API
     *
     * @return array List of available models
     */
    public function listModels(): array
    {
        $url = $this->baseUrl . '/models';
        return $this->makeRequest('GET', $url);
    }

    /**
     * Make HTTP request to Groq API
     *
     * @param string $method HTTP method (GET, POST, etc.)
     * @param string $url Full URL to call
     * @param array $data Data to send (for POST requests)
     * @return array Decoded JSON response
     * @throws \Exception When request fails
     */
    private function makeRequest(string $method, string $url, array $data = []): array
    {
        if (empty($this->apiKey)) {
            throw new \Exception('Groq API key not configured');
        }

        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json'
        ];

        $options = [
            'http' => [
                'header' => $headers,
                'method' => $method,
                'ignore_errors' => true
            ]
        ];

        if (!empty($data) && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            $options['http']['content'] = json_encode($data);
        }

        $context = stream_context_create($options);
        $response = file_get_contents($url, false, $context);

        if ($response === false) {
            $error = error_get_last();
            throw new \Exception('AI service request failed: ' . ($error['message'] ?? 'Unknown error'));
        }

        $decoded = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception('Invalid API response: ' . $response);
        }

        // Check for API errors
        if (isset($decoded['error'])) {
            throw new \Exception('Groq API error: ' . $decoded['error']['message']);
        }

        return $decoded;
    }

    /**
     * Check if API key is configured
     *
     * @return bool True if API key is set
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiKey) && !empty($this->baseUrl);
    }
}