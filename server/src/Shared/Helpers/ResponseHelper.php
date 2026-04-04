<?php

/**
 * JSON Response Helper
 * Sends a JSON response with the given status code and data
 * 
 * @param int $statusCode HTTP status code
 * @param array $data Response data
 * @return void
 */
function json_response(int $statusCode, array $data = []): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
}
