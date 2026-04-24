<?php

/**
 * Response Helper
 * Standardized JSON response formatting for API endpoints
 */

/**
 * Custom exception to signal that a response has been sent
 * Used in Appwrite function context to replace exit() calls
 */
if (!class_exists('ResponseSentException')) {
    class ResponseSentException extends \RuntimeException
    {
        public int $statusCode;
        public string $body;

        public function __construct(int $statusCode, string $body)
        {
            parent::__construct('response_sent');
            $this->statusCode = $statusCode;
            $this->body = $body;
        }
    }
}

if (!function_exists('json_response')) {
    /**
     * Send a JSON response
     *
     * @param int $statusCode HTTP status code
     * @param array $data Response data
     * @return void
     */
    function json_response(int $statusCode, array $data): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');

        $body = json_encode($data);
        echo $body;

        // In Appwrite function context, throw instead of exit()
        if (defined('APPWRITE_FUNCTION_CONTEXT')) {
            throw new ResponseSentException($statusCode, $body);
        }

        exit;
    }
}
