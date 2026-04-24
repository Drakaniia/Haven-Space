<?php

return function ($context) {
    // Get request method and path
    $method = $context->req->method ?? 'GET';
    $path = $context->req->path ?? '/';
    
    // Set CORS headers
    $headers = [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Appwrite-Project, X-Appwrite-Key, Accept',
        'Access-Control-Max-Age' => '86400'
    ];

    // Handle preflight OPTIONS request
    if ($method === 'OPTIONS') {
        return $context->res->text('', 200, $headers);
    }

    try {
        // Route handling
        switch ($path) {
            case '/':
                return $context->res->json([
                    'message' => 'Haven Space API',
                    'version' => '1.0.0',
                    'status' => 'active',
                    'timestamp' => date('c')
                ], 200, $headers);
            
            case '/health':
                return $context->res->json([
                    'status' => 'healthy',
                    'timestamp' => date('c'),
                    'service' => 'Haven Space API',
                    'version' => '1.0.0'
                ], 200, $headers);
            
            case '/test':
                return $context->res->json([
                    'message' => 'Test endpoint working',
                    'method' => $method,
                    'path' => $path,
                    'timestamp' => date('c'),
                    'environment' => [
                        'php_version' => phpversion(),
                        'endpoint' => getenv('APPWRITE_FUNCTION_ENDPOINT') ?: 'not set',
                        'project_id' => getenv('APPWRITE_FUNCTION_PROJECT_ID') ?: 'not set'
                    ]
                ], 200, $headers);
            
            default:
                return $context->res->json([
                    'error' => 'Route not found',
                    'path' => $path,
                    'available_routes' => ['/', '/health', '/test']
                ], 404, $headers);
        }
    } catch (Exception $e) {
        return $context->res->json([
            'error' => 'Internal server error',
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ], 500, $headers);
    } catch (Throwable $e) {
        return $context->res->json([
            'error' => 'Fatal error',
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ], 500, $headers);
    }
};